describe ("restoff, when offline, ", function() {

	it("01: should forceOffline and forceOnline", function() {
		var roff = restoff();
		return roff.get("http://test.development.com:4050/testsweb/testdata/addresses")
		.then(function(result){
			expect(roff.isForcedOffline, "isForcedOffline").to.be.false;
			expect(roff.isOnline, "isOnline").to.equal(roff.ONLINE);
			roff.forceOffline();
			expect(roff.isForcedOffline, "isForcedOffline").to.be.true;
			expect(roff.isOnline, "isOnline").to.equal(roff.ONLINE_NOT);
			roff.forceOnline();
			expect(roff.isForcedOffline, "isForcedOffline").to.be.false;
			expect(roff.isOnline, "isOnline").to.equal(roff.ONLINE_UNKNOWN);
		});
	});

	it("02: should create an empty repository when first accessed and offline", function() {
		var roff = restoff();
		roff.forceOffline();

		return roff.get("http://test.development.com:4050/testsweb/testdata/addresses")
		.then(function(result){
			expect(roff.isForcedOffline, "isForcedOffline").to.be.true;
			expect(roff.isOnline, "isOnline").to.equal(roff.ONLINE_NOT);
			expect(result, "Empty object").to.deep.equals([]);
		});
	});

	// // Actual offline test: Comment out this code and make sure your internet
	// // connection is turned off
	// it("should work offline when it is 'really' offline", function() {
	// 	var roff = restoff();
	// 	var offlineData = {
	// 		"offlineData": true
	// 	};

	// 	return roff.get("http://jsonplaceholder.typicode.com/posts")
	// 	.then(function(result){
	// 		expect(roff.isForcedOffline, "isForcedOffline").to.be.false;
	// 		expect(roff.isOnline, "isOnline").to.be.false;
	// 		expect(result, "Offlinedata").to.deep.equals(offlineData);
	// 	});
	// });	

});

