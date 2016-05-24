function logMessage(message) {
    console.log(message);
}

function deepEquals(x, y) {
    if ((typeof x == "object" && x !== null) && (typeof y == "object" && y !== null)) {
	      if (Object.keys(x).length != Object.keys(y).length) {
            return false;
        }

        for (var prop in x) {
							if (y.hasOwnProperty(prop)) {
									if (! deepEquals(x[prop], y[prop])) {
											return false;
									}
							}
							else {
									return false;
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
