function restoff() {
	return Object.create(RestOff.prototype);
}

function RestOff() {}
RestOff.prototype = Object.create(Object.prototype, {
	isOnline: {
		get: function() {
			return false;
		}
	}
});
restlib.restoff = restoff;
