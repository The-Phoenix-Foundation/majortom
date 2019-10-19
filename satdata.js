/* NASA Space app challenge */

// var satrec = satellite.twoline2satrec(longstr1, longstr2);
// Sample TLE
var sampleTleLine1 = '1 25544U 98067A   19156.50900463  .00003075  00000-0  59442-4 0  9992'
  , sampleTleLine2 = '2 25544  51.6433  59.2583 0008217  16.4489 347.6017 15.51174618173442';




var satelliteOrbits = {};
var currentSatellitePos = {};


function loadSatellites() {
    var satellitesEndpoint = 'https://phoenix.outdated.at/majortom/v1.0/satellites';
    var satData = fetch(satellitesEndpoint)
      .then(function(response) {
        return response.json();
      }).then(function(json) {
        satellites = json;
        console.log('parsed json of ', satellites.length, ' objects.')
        for (var s = 0; s < satellites.length; s++) {
            var sat = satellites[s];
            satelliteOrbits[sat.id] = tle2orbit(sat.line1, sat.line2);
            currentSatellitePos[sat.id] = tle2currentGeodetic(sat.line1, sat.line2);
        }
      }).catch(function(ex) {
        console.log('parsing failed', ex)
      });


    return satData;
}


// convert radians position and height in KM
function positionToDegreesKm(pos) {

    pos['longitude'] = satellite.radiansToDegrees(pos['longitude']);
    pos['latitude'] = satellite.radiansToDegrees(pos['latitude']);
    pos['altitude'] = pos['height'] * 1000.0;

    return pos;
}


function tle2orbit(tleLine1, tleLine2) {
    var satrec = satellite.twoline2satrec(tleLine1, tleLine2);

    // LEO satellites have an orbit of ca 127min
    // we use this for orbit propagation calc

    var sampleTime = new Date();
    // 
    var totalOrbitTimeMilis = 60 * 60 * 1000;
    var sampleCnt = 100;
    var sampleInterval = totalOrbitTimeMilis / sampleCnt;
    var orbitPosList = [];
    for (var i = - sampleCnt/2; i < sampleCnt/2; i++) {
        var sampleOffset = i * sampleInterval;
        var sampleTime = new Date(sampleTime.getTime() + sampleOffset);
        var positionAndVelocity = satellite.propagate(satrec, sampleTime);

        var gmst = satellite.gstime(sampleTime);
        var geodeticPos = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
 
        orbitPosList.push(positionToDegreesKm(geodeticPos));
    }

    return orbitPosList;
}

function tle2currentGeodetic(tleLine1, tleLine2) {
    // Initialize a satellite record
    var satrec = satellite.twoline2satrec(tleLine1, tleLine2);

    //  Or you can use a JavaScript Date
    var positionAndVelocity = satellite.propagate(satrec, new Date());
    var gmst = satellite.gstime(new Date());
    var positionEci = positionAndVelocity.position;

    var geodetic = satellite.eciToGeodetic(positionEci, gmst);

    return positionToDegreesKm(geodetic);
}
