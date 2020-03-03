/* NASA Space app challenge */

// convert radians position and height in KM
function positionToDegreesKm(pos) {

    pos['longitude'] = satellite.radiansToDegrees(pos['longitude']);
    pos['latitude'] = satellite.radiansToDegrees(pos['latitude']);
    pos['altitude'] = pos['height'] * 1000.0;

    return pos;
}

function satrec2currentGeodetic(satrec, sampleTime) {
    //  Or you can use a JavaScript Date
    var positionAndVelocity = satellite.propagate(satrec, sampleTime);

    var gmst = satellite.gstime(sampleTime);
    var positionEci = positionAndVelocity.position;

    var geodetic = satellite.eciToGeodetic(positionEci, gmst);

    return positionToDegreesKm(geodetic);
}

function satrec2orbit(satrec, sampleTime) {
    // LEO satellites have an orbit of ca 127min
    // we use this for orbit propagation calc
    var totalOrbitTimeMilis = 60 * 60 * 1000;
    var sampleCnt = 100;
    var sampleInterval = totalOrbitTimeMilis / sampleCnt;
    var orbitPosList = [];
    for (var i = - sampleCnt/2; i < sampleCnt/2; i++) {
        var sampleOffset = i * sampleInterval;
        var newDate = new Date(sampleTime.getTime() + sampleOffset);
        orbitPosList.push(satrec2currentGeodetic(satrec, newDate));
    }
    return orbitPosList;
}
