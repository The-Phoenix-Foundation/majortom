function jsonCopy(src) {
  return JSON.parse(JSON.stringify(src));
}
var satelliteObjects = {}
var filteredSatellites =[];
var userLocation = {latitude: 0, longitude:0};
var satelliteOrbitsDrawn = false;

function renderSatellite(satellite) {
    var currentSatelitePos = currentSatellitePos[satellite.id];
    var position = new WorldWind.Position(currentSatelitePos.latitude, currentSatelitePos.longitude, currentSatelitePos.altitude);
    var colladaLoader = new WorldWind.ColladaLoader(position);
    var scene = colladaLoader.parse(satelliteModelMap['satellite']);
    scene.scale = 10000;
    scene.position = position;
    satellitesLayer.addRenderable(scene);
    satelliteObjects[satellite.id] = {'scene': scene, 'data': satellite};
}

function renderSatellites()  {
    for (var i = 0; i< filteredSatellites.length;i++) {
        var satellite = filteredSatellites[i];
        renderSatellite(satellite);
    }
}

function renderSatelliteOrbits() {
   var colors = [WorldWind.Color.BLUE, WorldWind.Color.RED, WorldWind.Color.GREEN, WorldWind.Color.CYAN, WorldWind.Color.MAGENTA, 
                  WorldWind.Color.YELLOW];

   for (var sIdx = 0; sIdx< filteredSatellites.length;sIdx++) {
        var satellite = filteredSatellites[sIdx];
        var orbit = satelliteOrbits[satellite.id];
        var colorIdx = sIdx % colors.length;
        var positions = [];
        for (var i=0;i<orbit.length;i++) {
           var point = orbit[i];
           positions.push(new WorldWind.Position(point.latitude, point.longitude, 10000))
        }
        renderSatellitePath(positions,colors[colorIdx]);
   }
}

function renderSatellitePath(positions, color) {  
    var pathAttributes = new WorldWind.ShapeAttributes(null);
    pathAttributes.outlineColor = color;
    pathAttributes.interiorColor = new WorldWind.Color(0, 1, 1, 0.5);
    pathAttributes.drawVerticals = false; //Draw verticals only when extruding.
    var path = new WorldWind.Path(positions, pathAttributes);
    path.altitudeMode = WorldWind.ABSOLUTE; // The path's altitude stays relative to the terrain's altitude.
    //path.pathType = WorldWind.RHUMB_LINE;
    path.followTerrain = false;
    path.extrude = pathAttributes.drawVerticals; // Make it a curtain.
    path.useSurfaceShapeFor2D = true; // Use a surface shape in 2D mode.
    pathsLayer.addRenderable(path);   
}

function loadSatelliteModels() {
    var satelliteModels = ['satellite'];
    for (var i=0;i < satelliteModels.length; i++) {
        var model = satelliteModels[i]; 
        fetch(model+'.dae')
          .then(function(response) {
            return response.text()
          }).then(function(body) {
            satelliteModelMap[model] = body;
            loadSatellites();
          }).catch(function(ex) {
            console.log('parsing failed', ex)
        });
    }
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

// In this example, each full day/night cycle lasts 8 seconds in real time.
var simulatedMillisPerDay = 8000;

// Begin the simulation at the current time as provided by the browser.
var startTimeMillis = Date.now();



function getCurrentPosition(satellite) {
    return new WorldWind.Position(satellite.latitude, satellite.longitude, satellite.height); 
}

function updateSatellitePositions() {
    console.log("update position");
    for (var id in satelliteObjects) {
        var scene = satelliteObjects[id]['scene'];
        var satellite = satelliteObjects[id]['data'];
        var position = getCurrentPosition(satellite)
        scene.position = position;
    }
}


var last = 0;
function runAnimation() {
    // Compute the number of simulated days (or fractions of a day) since the simulation began.
    var elapsedTimeMillis = Date.now() - startTimeMillis;
    var simulatedDays = elapsedTimeMillis / simulatedMillisPerDay;

    // Compute a real date in the future given the simulated number of days.
    var millisPerDay = 24 * 3600 * 1000; // 24 hours/day * 3600 seconds/hour * 1000 milliseconds/second
    var simulatedMillis = simulatedDays * millisPerDay;
    var simulatedDate = new Date(startTimeMillis + simulatedMillis);

    // Update the date in both the Starfield and the Atmosphere layers.
    //starFieldLayer.time = simulatedDate;
    //atmosphereLayer.time = simulatedDate;
    if (++last % 120 == 0) updateSatellitePositions();
    wwd.redraw(); // Update the WorldWindow scene.

    requestAnimationFrame(runAnimation);
}

// Animate the starry sky as well as the globe's day/night cycle.
requestAnimationFrame(runAnimation);
showLocation()

loadSatellites().then(function(){
    filteredSatellites = satellites.filter(function(s){
        var currentSatelitePosition = currentSatellitePos[s.id];
        return satellite_in_distance(currentSatelitePosition, userLocation, 1000 )
    })
   
    renderSatelliteOrbits();
    //renderSatellites();
});


