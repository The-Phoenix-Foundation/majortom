/*
 * Copyright 2015-2017 WorldWind Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 *  Illustrates how to animate the passage of time with a day/night cycle on the surface of the globe,
 *  as well as the starry sky above the Earth (with realistic star positions).
 */

// Tell WorldWind to log only warnings and errors.
WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

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

function renderSatellitePath(satellite) {
    var position = new WorldWind.Position(satellite.latitude, satellite.longitude, satellite.height);
    var pathAttributes = new WorldWind.ShapeAttributes(null);
    pathAttributes.outlineColor = WorldWind.Color.BLUE;
    pathAttributes.interiorColor = new WorldWind.Color(0, 1, 1, 0.5);
    pathAttributes.drawVerticals = false; //Draw verticals only when extruding.
    var path = new WorldWind.Path(satellite.pathPositions, pathAttributes);
    path.altitudeMode = WorldWind.RELATIVE_TO_GROUND; // The path's altitude stays relative to the terrain's altitude.
    path.followTerrain = false;
    path.extrude = pathAttributes.drawVerticals; // Make it a curtain.
    path.useSurfaceShapeFor2D = true; // Use a surface shape in 2D mode.
    pathsLayer.addRenderable(path);   
}

function renderSatellite(satellite) {
    var position = new WorldWind.Position(satellite.latitude, satellite.longitude, satellite.height);
    var colladaLoader = new WorldWind.ColladaLoader(position);
    colladaLoader.init({dirPath: ''});
    colladaLoader.load('satellite.dae', function (scene) {
        scene.scale = 10000;
        satellitesLayer.addRenderable(scene); // Add the Collada model to the renderable layer within a callback.
    });
    
}

function runSimulation() {
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
    wwd.redraw(); // Update the WorldWindow scene.

    requestAnimationFrame(runSimulation);
}

// Animate the starry sky as well as the globe's day/night cycle.
requestAnimationFrame(runSimulation);

// Create a layer manager for controlling layer visibility.
//var layerManager = new LayerManager(wwd);

var height = 100000;
var satellite = {
    latitude: 45.1366909,
    longitude: 18.3394671,
    height: height,
    pathPositions: [
      new WorldWind.Position(45.1366909, 18.3394671, height), 
      new WorldWind.Position(46.1366909, 19.3394671, height),
      new WorldWind.Position(45.1366909, 18.3394671, height)
    ],
} 
renderSatellite(satellite);
renderSatellitePath(satellite);

showLocation()



function showLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(location) {
            var userLocation = new WorldWind.Position(location.coords.latitude, location.coords.longitude, 0);
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