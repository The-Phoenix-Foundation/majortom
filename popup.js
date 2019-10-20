var modelwwd;
var modelLayer = new WorldWind.RenderableLayer("satellites");
//modelwwd.goTo(userLocation);
var selectedSatellite;

function showPopup(userObject) {
    $('#satelliteName').text(userObject.displayName);
    $("#info").load("https://phoenix.outdated.at/majortom/v1.0/info/" + userObject.displayName);
    $('#satelliteModal').modal();
    console.log(userObject);
    selectedSatellite = satelliteObjects[userObject.displayName]['satellite']
    renderSatelliteModel()

}

function renderSatelliteModel() {
    if (!modelwwd) 
       return;
    var satellite = selectedSatellite;
    modelLayer.removeAllRenderables();
    var currentSatelitePosition = currentSatellitePos[satellite.id];
    var position = new WorldWind.Position(currentSatelitePosition.latitude, currentSatelitePosition.longitude, currentSatelitePosition.altitude);
    modelwwd.goto(position)
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

