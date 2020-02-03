//test data
var test1 = {longitude:16.363449, latitude:48.210033};
var test2 = {longitude:15.63333, latitude:48.2};
satellite_in_distance(test1, test2, 100)
distance_geographic(48.210033, 16.363449,48.2,15.63333)


function distance_geographic(lat1, lon1, lat2, lon2) {
	if ((lat1 == lat2) && (lon1 == lon2)) {
		return 0;
	}
	else {
		var radlat1 = Math.PI * lat1/180;
		var radlat2 = Math.PI * lat2/180;
		var theta = lon1-lon2;
		var radtheta = Math.PI * theta/180;
		var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
		if (dist > 1) {
			dist = 1;
		}
		dist = Math.acos(dist);
        dist = dist * 180/Math.PI;
        dist = dist * 60 * 1.1515;
        dist = dist * 1.609344;
		return dist;
	}
}

function satellite_in_distance(satellite, location, distance) {
	try {

		sat_long = satellite.longitude;
		sat_lat = satellite.latitude;

		loc_long = location.longitude;
		loc_lat = location.latitude;
			
		distance_calc = distance_geographic(sat_lat, sat_long, loc_lat, loc_long);

		return (Math.round(distance_calc) <= Math.round(distance));
	}
	catch(err) {
		console.log(err);
		return false;
	}
}