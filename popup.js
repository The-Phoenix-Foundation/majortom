var modelwwd;
var modelLayer = new WorldWind.RenderableLayer("satellites");

//modelwwd.goTo(userLocation);
var selectedSatellite;
var collectedSatellites = loadCollectedSats();

function showPopup(userObject) {
    $('#satelliteName').text(userObject.displayName);
    $("#info").load("https://phoenix.outdated.at/majortom/v1.0/info/" + userObject.displayName);

    $("#collectButton").data("designator", userObject.displayName);
    if (isCollectedSatellite(userObject.displayName)) {
        $("#collectedSatelliteNO").hide();
        $("#collectedSatelliteYES").show();
    } else {
        $("#collectedSatelliteNO").show();
        $("#collectedSatelliteYES").hide();
    }

    $('#satelliteModal').modal();
    console.log(userObject);
    selectedSatellite = satelliteObjects[userObject.displayName]['data']
    updateSatelliteStats(selectedSatellite);
    $('#modelCanvas').height(480).width(640);
    renderSatelliteModel()
    renderInventory();

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
    var currentSatelitePosition = new WorldWind.Position(0, 0, 0); //currentSatellitePos[satellite.id];
    var position = new WorldWind.Position(currentSatelitePosition.latitude, currentSatelitePosition.longitude, currentSatelitePosition.altitude);
    var viewPosition = new WorldWind.Position(currentSatelitePosition.latitude, currentSatelitePosition.longitude, 
                                    currentSatelitePosition.altitude + 300000);
    modelwwd.goTo(viewPosition)
    var colladaLoader = new WorldWind.ColladaLoader(position);
    var category = satellite.category;
    colladaLoader.init({dirPath: './models/'+category+'/'});
    var scene = colladaLoader.parse(satelliteModelMap[category]);
    scene.displayName = satellite.id;
    scene.scale = 10000;
    scene.position = position;
    scene.altitudeMode = WorldWind.ABSOLUTE;
    scene.xRotation = -35.0;
    scene.yRotation = -35.0;
    scene.zRotation = -35.0;
    //scene.zTranslation = 30.0;
    modelLayer.addRenderable(scene);
}

function renderInventory() {
    var inventoryContainer  = $('#inventoryContiner');
    inventoryContainer.empty();
    for (var i=0;i<collectedSatellites.length;i++) {
       var collectedSatellite = collectedSatellites[i];
       var sat = satellites.filter(function(s){
           return s.id == collectedSatellite;
       })[0];
       var li = $('<li style="margin:10px;">');
       var image = $('<img style="width:60px;height:60px;" src="/models/'+sat.category+'.jpg">');
       var name = $("<span>").text(collectedSatellite);
       li.append(image);
       li.append(name);
       inventoryContainer.append(li);
       
    }
    console.log(collectedSatellites);
}

function loadCollectedSats() {
    var sats = getCookie('majortom');
    if (sats === null) {
        return [];
    } else {
        return JSON.parse(sats);
    }
}

function addSatellite(designator) {
    collectedSatellites.push(designator);
    setCookie('majortom', JSON.stringify(collectedSatellites));
    renderInventory();
}

function isCollectedSatellite(designator) {
    return collectedSatellites.includes(designator);
}

// copied from
function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
function eraseCookie(name) {
    document.cookie = name+'=; Max-Age=-99999999;';
}

