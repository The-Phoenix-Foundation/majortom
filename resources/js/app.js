/** MajorTom app.js
 * =================
 *
 */
class SatelliteRenderer {

    constructor(wwd, userLocation, userDistance) {
        this._userLocation = userLocation;
        this._userDistance = userDistance;

        this._wwd = wwd.wwd;
        this._layers = {
            satellitesLayer: wwd.satellitesLayer,
            orbitsLayer: wwd.pathsLayer,
            starFieldLayer: wwd.starFieldLayer,
            atmosphereLayer: wwd.atmosphereLayer
        };
        this._satcols = new Map();
        this._satcats = new Map();

        this._filteredSatrecs = new Map();
        this._renderSceneObjects = new Map();

        this._categoryModels = new Map();
        this._orbitColors = [
            WorldWind.Color.BLUE, WorldWind.Color.RED, WorldWind.Color.GREEN,
            WorldWind.Color.CYAN, WorldWind.Color.MAGENTA, WorldWind.Color.YELLOW
        ];
        this._satelliteModels = ['0', '1', '2', '3'];

        this._initPromises = this.asyncLoadModels();
    }

    getCategory(satId) {
        if (!this._satcats.has(satId)) {
            this._satcats.set(satId, this._satelliteModels[this._satcats.size % this._satelliteModels.length]);
        }
        return this._satcats.get(satId);
    }

    getColor(satId) {
        if (!this._satcols.has(satId)) {
            this._satcols.set(satId, this._orbitColors[this._satcols.size % this._orbitColors.length]);
        }
        return this._satcols.get(satId);
    }

    initWorker() {
        const self = this;
        this._worker = new Worker('./resources/js/position_updater.js');
        this._worker.addEventListener('message', function (msg) {
            // console.log("worker", msg.data);
            if (msg.data[0] === "filtered") {
                self._filteredSatrecs = msg.data[1];
            }
        });
        this._worker.addEventListener('error', function (msg) {
            console.log("workerror", msg.data);
        });
    }

    updatePositionsWorkerStart() {
        if (!this._worker) {
            this.initWorker();
        }
        const self = this;
        this._worker.postMessage({
            cmd: 'start',
            url: "../../celestrak/active.txt",
            location: self._userLocation,
            distance: self._userDistance,
        });
    }
    updatePositionsWorkerStop() {
        this._worker.postMessage({cmd: 'stop'});
    }

    render() {
        let sampleTime = new Date();

        let satIds = new Set([...this._filteredSatrecs.keys(), ...this._renderSceneObjects.keys()]);
        let added = 0;

        for (let satId of satIds) {

            const renderSat = this._renderSceneObjects.has(satId);
            const visible = this._filteredSatrecs.has(satId);
            let satrec, pos;

            if (visible && !renderSat && added < 1) {
                // add and render
                satrec = this._filteredSatrecs.get(satId);
                pos = satrec2currentGeodetic(satrec, sampleTime);
                this._renderSceneObjects.set(satId, {
                    scene: this._renderSatellite(satId, pos, this.getCategory(satId)),
                    path: this._renderSatelliteOrbits(satId, this.getColor(satId), satrec, sampleTime),
                });
                console.log('adding ' + satId);

            } else if (!visible && renderSat) {
                // remove
                const sceneObject = this._renderSceneObjects.get(satId);
                if (sceneObject.path) {
                    this._layers.orbitsLayer.removeRenderable(sceneObject.path);
                    sceneObject.path = null;
                }
                if (sceneObject.scene) {
                    this._layers.satellitesLayer.removeRenderable(sceneObject.scene);
                    sceneObject.scene = null;
                }
                this._renderSceneObjects.delete(satId);
                console.log('removing ' + satId);
                added += 1;

            } else if (visible && renderSat) {
                satrec = this._filteredSatrecs.get(satId);
                pos = satrec2currentGeodetic(satrec, sampleTime);
                let scene = this._renderSceneObjects.get(satId).scene;
                scene.position = new WorldWind.Position(pos.latitude, pos.longitude, pos.altitude);
            }

        }
    }

    _renderSatellite(satId, satPos, category) {
        let position = new WorldWind.Position(satPos.latitude, satPos.longitude, satPos.altitude);
        let colladaLoader = new WorldWind.ColladaLoader(position);
        colladaLoader.init({dirPath: './resources/models/' + category + '/'});

        let scene = colladaLoader.parse(this._categoryModels.get(category));
        scene.displayName = satId;
        scene.satelliteCategory = category;
        scene.scale = 10000;
        scene.position = position;
        scene.altitudeMode = WorldWind.ABSOLUTE;

        this._layers.satellitesLayer.addRenderable(scene);
        return scene;
    }

    _renderSatelliteOrbits(satId, color, satrec, sampleTime) {
        var orbit = satrec2orbit(satrec, sampleTime);

        var positions = [];
        for (var i = 0; i < orbit.length; i += 1) {
            var point = orbit[i];
            positions.push(new WorldWind.Position(point.latitude, point.longitude, point.altitude));
        }

        let pathAttributes = new WorldWind.ShapeAttributes(null);
        pathAttributes.outlineColor = color;
        pathAttributes.interiorColor = color;
        pathAttributes.drawVerticals = false;
        let path = new WorldWind.Path(positions, pathAttributes);
        path.altitudeMode = WorldWind.ABSOLUTE; // The path's altitude stays relative to the terrain's altitude.
        // path.pathType = WorldWind.LINEAR;
        path.followTerrain = false;
        path.extrude = pathAttributes.drawVerticals; // Make it a curtain.
        path.useSurfaceShapeFor2D = true; // Use a surface shape in 2D mode.
        path.displayName = satId;

        this._layers.orbitsLayer.addRenderable(path);
        return path;
    }

    asyncLoadModels() {
        const self = this;
        let modelPromises = [];
        for (let model of self._satelliteModels) {
            modelPromises.push(
                fetch('/resources/models/' + model + '/' + model + '.dae')
                    .then(function (response) {
                        return response.text();
                    }).then(function (body) {
                        self._categoryModels.set(model, body);
                    }).catch(function (ex) {
                        console.log('parsing failed', ex)
                    })
            );
        }
        return modelPromises;
    }

    start() {
        const self = this;
        Promise.all(this._initPromises).then(function () {
            // let idx = 0;
            self.updatePositionsWorkerStart();

            function runAnimation() {

                self.render();  // render new objects and remove old

                let date = new Date();
                self._layers.starFieldLayer.time = date;
                self._layers.atmosphereLayer.time = date;
                self._wwd.redraw(); // Update the WorldWindow scene.

                requestAnimationFrame(runAnimation);
            }
            requestAnimationFrame(runAnimation);
        });
    }

}

function getLocation() {
    const vienna = {
        coords: {
            latitude: 48.2082,
            longitude: 16.3738,
            altitude: 0,
        }
    };
    const distanceKM = 1000;
    return new Promise(function (resolve, reject) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (location) {
                resolve([location, distanceKM]);
            }, function (error) {
                resolve([vienna, distanceKM]);
            });
        } else {
            resolve([vienna, distanceKM]);
        }
    });
}

function setupLocation(wwd, circleLayer, placemarkLayer, location, distanceKM) {
    const userLocation = new WorldWind.Position(location.coords.latitude, location.coords.longitude, 0);

    // circle drawing
    const circle_attribs = new WorldWind.ShapeAttributes();
    circle_attribs.interiorColor.alpha = 0.15;
    circle_attribs.interiorColor.blue = 0;
    circle_attribs.outlineWidth = 3;
    const surfCirle = new WorldWind.SurfaceCircle(userLocation, distanceKM * 1000, circle_attribs);

    // var pinLibrary = WorldWind.configuration.baseUrl + "images/pushpins/";
    wwd.goTo(userLocation);

    const colladaLoader = new WorldWind.ColladaLoader(userLocation);
    colladaLoader.init({dirPath: './resources/models/dish/'});
    colladaLoader.load('dish.dae', function (dish) {
        if (!dish)
            return;
        dish.scale = 500;
        dish.altitudeMode = WorldWind.CLAMP_TO_GROUND;
        dish.xRotation = -35.0;
        dish.yRotation = -35.0;
        dish.zRotation = -35.0;
        dish.zTranslation = 30.0;
        placemarkLayer.addRenderable(dish);
    });

    const placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
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
    placemarkAttributes.dephTest = false;
    placemarkAttributes.leaderLineAttributes.outlineColor = WorldWind.Color.RED;
    // placemarkAttributes.imageSource = pinLibrary + 'castshadow-red.png';
    const placeMarkLocation = new WorldWind.Position(location.coords.latitude, location.coords.longitude, 100000);
    placemark = new WorldWind.Placemark(placeMarkLocation, true, placemarkAttributes);
    placemark.label = "Your position\n"
        + "Lat " + placemark.position.latitude.toPrecision(4).toString() + "\n"
        + "Lon " + placemark.position.longitude.toPrecision(5).toString();
    placemark.altitudeMode = WorldWind.ABSOLUTE;
    circleLayer.addRenderable(surfCirle);

    return [userLocation, distanceKM];
}

function setupWorldWind(selectCallback) {
    // Tell WorldWind to log only warnings and errors.
    WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);
    // Create the WorldWindow.
    const wwd = new WorldWind.WorldWindow('canvasOne');

    // Create imagery layers.
    wwd.addLayer(new WorldWind.BMNGOneImageLayer());
    wwd.addLayer(new WorldWind.BMNGLayer());

    const starFieldLayer = new WorldWind.StarFieldLayer();
    const atmosphereLayer = new WorldWind.AtmosphereLayer();
    const satellitesLayer = new WorldWind.RenderableLayer("satellites");
    const circleLayer = new WorldWind.RenderableLayer("Circle");
    circleLayer.opacity = 0.1;
    const placemarkLayer = new WorldWind.RenderableLayer("Placemarks");
    const pathsLayer = new WorldWind.RenderableLayer("Paths");

    wwd.addLayer(starFieldLayer);
    wwd.addLayer(atmosphereLayer);
    wwd.addLayer(circleLayer);
    wwd.addLayer(placemarkLayer);
    wwd.addLayer(satellitesLayer);
    wwd.addLayer(pathsLayer);

    // set time
    let now = new Date();
    starFieldLayer.time = now;
    atmosphereLayer.time = now;


    function handleClick (recognizer) {
        // Obtain the event location.
        let x = recognizer.clientX,
            y = recognizer.clientY;

        // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
        // relative to the upper left corner of the canvas rather than the upper left corner of the page.
        let pickList = wwd.pick(wwd.canvasCoordinates(x, y));
        // If only one thing is picked and it is the terrain, use a go-to animator to go to the picked location.
        if (pickList.objects.length === 2 && pickList.objects[0].parentLayer.displayName === 'satellites') {
            // var position = pickList.objects[0].position;
            let userObject = pickList.objects[0].userObject;
            console.log('userObject', userObject);
            selectCallback(userObject);
        }
    }

    // setup click handlers
    const clickRecognizer = new WorldWind.ClickRecognizer(wwd, handleClick);
    const tapRecognizer = new WorldWind.TapRecognizer(wwd, handleClick);

    return {
        wwd: wwd,
        circleLayer: circleLayer,
        starFieldLayer: starFieldLayer,
        atmosphereLayer: atmosphereLayer,
        satellitesLayer: satellitesLayer,
        pathsLayer: pathsLayer,
        placemarkLayer: placemarkLayer,
    }
}

