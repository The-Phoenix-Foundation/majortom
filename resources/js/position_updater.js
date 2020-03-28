importScripts("https://cdnjs.cloudflare.com/ajax/libs/satellite.js/3.0.1/satellite.min.js");
importScripts('./satdata.js');
importScripts('./long_lat.js');


let shouldRun = true;
const satrecs = new Map();
let userLocation = {longitude: 0, latitude: 0};
let userDistance = 1000;

onmessage = function(e) {
    const data = e.data;
    if (!data || !data.cmd) {
        postMessage(['error0', null]);
        shouldRun = false;

    } else if (data.cmd === 'start' && data.url && data.location && data.distance) {
        userLocation = data.location;
        userDistance = data.distance;
        loadSatRecs(data.url);

    } else if (data.cmd === 'stop') {
        shouldRun = false;

    } else {
        postMessage(['error1', data]);
        shouldRun = false;
    }
};

function loadSatRecs(url) {
    fetch(url).then(function (response) {
        return response.text();
    }).then(function (body) {
        let data = body.split('\n');
        for (let i = 0; i < data.length; i += 3) {
            if (data[i].trim()) {
                let satId = data[i + 1].slice(9, 17).trim();
                let tleLine1 = data[i + 1];
                let tleLine2 = data[i + 2];
                let satrec = satellite.twoline2satrec(tleLine1, tleLine2);
                satrecs.set(satId, satrec);
            }
        }
    }).catch(function(ex) {
        postMessage(['parsing failed', ex]);
    });
}

function mainLoop() {
    if (satrecs.size) {
        const filteredSatrecs = new Map();
        for (let [satId, satrec] of satrecs.entries()) {
            let sampleTime = new Date();
            try {
                let pos = satrec2currentGeodetic(satrec, sampleTime);
                const visible = satellite_in_distance(pos, userLocation, userDistance);
                if (visible) {
                    filteredSatrecs.set(satId, satrec);
                }
            } catch (err) {
                console.log('error parsing satrecs', err);
            }
        }
        postMessage(['filtered', filteredSatrecs]);
        if (shouldRun) {
            setTimeout(mainLoop, 1000);
        }
    } else {
        postMessage(['empty', 'waiting']);
        if (shouldRun) {
            setTimeout(mainLoop, 1000);
        }
    }
}

mainLoop();
