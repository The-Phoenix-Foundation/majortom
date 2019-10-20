function jsonCopy(src) {
  return JSON.parse(JSON.stringify(src));
}
var satelliteObjects = {}
var satellites = [];
var filteredSatellites = [];
var visibleSatellites = new Set([]);
var userLocation = {latitude: 0, longitude:0};
var satelliteOrbitsDrawn = false;

function renderSatellite(satellite) {
    var currentSatelitePosition = currentSatellitePos[satellite.id];
    var position = new WorldWind.Position(currentSatelitePosition.latitude, currentSatelitePosition.longitude, currentSatelitePosition.altitude);
    var colladaLoader = new WorldWind.ColladaLoader(position);
    var category = satellite.category;
    colladaLoader.init({dirPath: './models/'+category+'/'});
    var scene = colladaLoader.parse(satelliteModelMap[category]);
    scene.displayName = satellite.id;
    scene.scale = 10000;
    scene.position = position;
    scene.altitudeMode = WorldWind.ABSOLUTE;
    satellitesLayer.addRenderable(scene);
    satelliteObjects[satellite.id] = {'scene': scene, 'data': satellite};
}

function renderSatellitePath(positions, color,id) {  
    var pathAttributes = new WorldWind.ShapeAttributes(null);
    pathAttributes.outlineColor = color;
    pathAttributes.interiorColor = color;
    //new WorldWind.Color(0, 1, 1, 0.5);
    pathAttributes.drawVerticals = false; //Draw verticals only when extruding.
    var path = new WorldWind.Path(positions, pathAttributes);
    path.altitudeMode = WorldWind.ABSOLUTE; // The path's altitude stays relative to the terrain's altitude.
    //path.pathType = WorldWind.LINEAR;
    path.followTerrain = false;
    path.extrude = pathAttributes.drawVerticals; // Make it a curtain.
    path.useSurfaceShapeFor2D = true; // Use a surface shape in 2D mode.
    path.displayName = id;
    pathsLayer.addRenderable(path);   
}

function renderSatelliteOrbits(satellite, color) {
    var orbit = satelliteOrbits[satellite.id];
    var positions = [];
    for (var i=0;i<orbit.length;i++) {
       var point = orbit[i];
       positions.push(new WorldWind.Position(point.latitude, point.longitude, point.altitude))
    }
    renderSatellitePath(positions,color, satellite.id);
}


function renderSatellites()  {
   var colors = [WorldWind.Color.BLUE, WorldWind.Color.RED, WorldWind.Color.GREEN, 
                 WorldWind.Color.CYAN, WorldWind.Color.MAGENTA, WorldWind.Color.YELLOW];
    for (var i = 0; i< filteredSatellites.length;i++) {
        var colorIdx = i % colors.length;
        var color = colors[colorIdx];
        var satellite = filteredSatellites[i];
        if (!satellite.rendered || false ) {
            renderSatellite(satellite);
            renderSatelliteOrbits(satellite, color);
            satellite.rendered = true;
        }

    }
}


function loadSatelliteModels() {
    var satelliteModels = ['0', '1', '2', '3'];
    var allPromises = []
    for (var i=0;i < satelliteModels.length; i++) {
        let model = satelliteModels[i]; 
        allPromises.push(fetch('/models/'+ model+'/'+model+'.dae')
          .then(function(response) {
            return response.text()
          }).then(function(body) {
            satelliteModelMap[model] = body;
          }).catch(function(ex) {
            console.log('parsing failed', ex)
        }));
    }
    Promise.all(allPromises).then(function(){
       loadSatellites().then(function(){
           update();
       }) 
    });
}

function removeRenderable(layer, removedSatellites) {
    for (var i=0;i<layer.renderables.length;i++) {
        var renderable = layer.renderables[i];
        if (removedSatellites.has(renderable.displayName)) {
            layer.removeRenderable(renderable);
        }
    }
}

function filterSatellites() {
    newFilteredSatellites = satellites.filter(function(s){
        var currentSatelitePosition = currentSatellitePos[s.id];
        return satellite_in_distance(currentSatelitePosition, userLocation, 1000 )
    });
    newFilteredIds = new Set(newFilteredSatellites.map(function(x) {
        return x.id;
    }))
    var difference = new Set([...filteredSatellites.map(function(x) {
        return x.id;
    })].filter(x => !newFilteredIds.has(x)));
    console.log(newFilteredSatellites.length + ' satellites visible');
    console.log(difference.size + ' satellites out of range');
    filteredSatellites = newFilteredSatellites;
    removeRenderable(satellitesLayer,difference);
    removeRenderable(pathsLayer, difference);
    difference.forEach(function(k,v){
       v.rendered = false; 
    });

}

function update() {
    filterSatellites();
    renderSatellites();
}

function showLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(location) {
            userLocation = new WorldWind.Position(location.coords.latitude, location.coords.longitude, 0);
            var pinLibrary = WorldWind.configuration.baseUrl + "images/pushpins/";
            wwd.goTo(userLocation);
            var placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
            placemarkAttributes.imageScale = 1;
            placemarkAttributes.imageOffset = new WorldWind.Offset(
                WorldWind.OFFSET_FRACTION, 0.3,
                WorldWind.OFFSET_FRACTION, 0.0);
            placemarkAttributes.imageColor = WorldWind.Color.WHITE;
            placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
                WorldWind.OFFSET_FRACTION, 0.5,
                WorldWind.OFFSET_FRACTION, 1.0);
            placemarkAttributes.labelAttributes.color = WorldWind.Color.YELLOW;
            placemarkAttributes.drawLeaderLine = true;
            placemarkAttributes.leaderLineAttributes.outlineColor = WorldWind.Color.RED;
            placemarkAttributes.imageSource = pinLibrary + 'castshadow-red.png';

            placemark = new WorldWind.Placemark(userLocation, true, placemarkAttributes);
            placemark.label = "Your position\n"
                + "Lat " + placemark.position.latitude.toPrecision(4).toString() + "\n"
                + "Lon " + placemark.position.longitude.toPrecision(5).toString();
            placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
            placemarkLayer.addRenderable(placemark);
        });
    }   
}

// Tell WorldWind to log only warnings and errors.
WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);
var satellites;
var satelliteModelMap = {};
loadSatelliteModels();
// Create the WorldWindow.
var wwd = new WorldWind.WorldWindow('canvasOne');

// Create imagery layers.
var BMNGOneImageLayer = new WorldWind.BMNGOneImageLayer();
var BMNGLayer = new WorldWind.BMNGLayer();
wwd.addLayer(BMNGOneImageLayer);
wwd.addLayer(BMNGLayer);

// Use the StarField layer to show stars and the Sun around the globe, and the Atmosphere layer to display
// the atmosphere effect and the night side of the Earth.
// Note that the StarField layer requires a dark canvas background color.
// The StarField layer should be added before the Atmosphere layer.
var starFieldLayer = new WorldWind.StarFieldLayer();
var atmosphereLayer = new WorldWind.AtmosphereLayer();
var satellitesLayer = new WorldWind.RenderableLayer("satellites");
var placemarkLayer = new WorldWind.RenderableLayer("Placemarks");
var pathsLayer = new WorldWind.RenderableLayer("Paths");
        
wwd.addLayer(starFieldLayer);
wwd.addLayer(atmosphereLayer);
wwd.addLayer(placemarkLayer);
wwd.addLayer(satellitesLayer);
wwd.addLayer(pathsLayer);

// Set a date property for the StarField and Atmosphere layers to the current date and time.
// This enables the Atmosphere layer to show a night side (and dusk/dawn effects in Earth's terminator).
// The StarField layer positions its stars according to this date.
var now = new Date();
starFieldLayer.time = now;
atmosphereLayer.time = now;

// The common gesture-handling function.
var handleClick = function (recognizer) {
    // Obtain the event location.
    var x = recognizer.clientX,
        y = recognizer.clientY;

    // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
    // relative to the upper left corner of the canvas rather than the upper left corner of the page.
    var pickList = wwd.pick(wwd.canvasCoordinates(x, y));
    console.log(pickList);
    // If only one thing is picked and it is the terrain, use a go-to animator to go to the picked location.
    if (pickList.objects.length == 2 && pickList.objects[0].parentLayer.displayName == 'satellites') {
        var position = pickList.objects[0].position;
        var userObject = pickList.objects[0].userObject;
        $('#satelliteName').text(userObject.displayName);
        $('#satelliteModal').modal();

        console.log(pickList.objects[0]);
    }
};

// Listen for mouse clicks.
var clickRecognizer = new WorldWind.ClickRecognizer(wwd, handleClick);

// Listen for taps on mobile devices.
var tapRecognizer = new WorldWind.TapRecognizer(wwd, handleClick);




function updateSatellitePositions() {
    var sampleTime = new Date();
    for (var i = 0; i<satellites.length;i++) {
        var satellite = satellites[i];
        var pos = tle2currentGeodetic(satellite.line1, satellite.line2, sampleTime);
        currentSatellitePos[satellite.id] = pos;
         if (satellite.id in satelliteObjects) {
            var scene = satelliteObjects[satellite.id]['scene'];
            scene.position =  new WorldWind.Position(pos.latitude, pos.longitude, pos.altitude);
         }
    }
}


var last = 0;
function runAnimation() {
    var date = new Date();
    // Update the date in both the Starfield and the Atmosphere layers.
    starFieldLayer.time = date;
    atmosphereLayer.time = date;
    updateSatellitePositions();
    if (++last % 300 == 0) update();
    wwd.redraw(); // Update the WorldWindow scene.

    requestAnimationFrame(runAnimation);
}

// Animate the starry sky as well as the globe's day/night cycle.
requestAnimationFrame(runAnimation);
showLocation();


