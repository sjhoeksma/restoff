function logMessage(message) {
    console.log(message);
}

function deepEquals(x, y) {
    if ((typeof x == "object" && x !== null) && (typeof y == "object" && y !== null)) {
			  //Clean out the angular keys
			  var xc = x.hasOwnProperty('$$hashKey') ? 0 : 1;
			  var yc = y.hasOwnProperty('$$hashKey') ? 0 : 1;
	      if (Object.keys(x).length+xc != Object.keys(y).length+yc) {
            return false;
        }

        for (var prop in x) {
					  if (prop!='$$hashKey') {
							if (y.hasOwnProperty(prop)) {
									if (! deepEquals(x[prop], y[prop])) {
											return false;
									}
							}
							else {
									return false;
							}
						}
        }
        return true;
    } else return x === y;
}

// TODO: Maybe use a library. See http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
function uuidGenerate() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}
