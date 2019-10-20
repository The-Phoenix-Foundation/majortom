var modelwwd;
var modelLayer = new WorldWind.RenderableLayer("satellites");

//modelwwd.goTo(userLocation);
var selectedSatellite;

function showPopup(userObject) {
    $('#satelliteName').text(userObject.displayName);
    $("#info").load("https://phoenix.outdated.at/majortom/v1.0/info/" + userObject.displayName);
    $('#satelliteModal').modal();
    console.log(userObject);
    selectedSatellite = satelliteObjects[userObject.displayName]['data']
    updateSatelliteStats(selectedSatellite);
    $('#modelCanvas').height(480).width(640);
    renderSatelliteModel()

}

function updateSatelliteStats(satellite) {
    var sat_id = satellite['id'];
    var sat_catalog = satellite['catalog_number'];
    var shiny_url = 'https://phoenix.outdated.at/shiny/?catalog_number=' + sat_catalog
    var stats_frame = document.getElementById("stats_frame").src = shiny_url;
}

function renderSatelliteModel() {
    if (!modelwwd) 
       return;
    var satellite = selectedSatellite;
    modelLayer.removeAllRenderables();
    var currentSatelitePosition = currentSatellitePos[satellite.id];
    var position = new WorldWind.Position(currentSatelitePosition.latitude, currentSatelitePosition.longitude, currentSatelitePosition.altitude);
    var viewPosition = new WorldWind.Position(currentSatelitePosition.latitude, currentSatelitePosition.longitude, 
                                    currentSatelitePosition.altitude + 251975);
    modelwwd.goTo(viewPosition)
    var colladaLoader = new WorldWind.ColladaLoader(position);
    var category = satellite.category;
    colladaLoader.init({dirPath: './models/'+category+'/'});
    var scene = colladaLoader.parse(satelliteModelMap[category]);
    scene.displayName = satellite.id;
    scene.scale = 10000;
    scene.position = position;
    scene.altitudeMode = WorldWind.ABSOLUTE;
    modelLayer.addRenderable(scene);
}

