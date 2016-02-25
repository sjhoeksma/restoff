describe ("restoff, when offline, ", function() {

	var ROOT_URI = "http://test.development.com:3000/";

	it("01: should forceOffline and forceOnline", function() {
		var roff = restoff({
			"rootUri" : ROOT_URI
		});
		expect(roff.isForcedOffline, "isForcedOffline").to.be.false;
		expect(roff.isOnline, "isOnline").to.be.false;
		expect(roff.isOffline, "isOffline").to.be.false;
		expect(roff.isOnlineUnknown, "isOnlineUnknown").to.be.true;

		return roff.get("users01").then(function(result){
			expect(roff.isForcedOffline, "isForcedOffline").to.be.false;
			expect(roff.isOnline, "isOnline").to.be.true;
			expect(roff.isOffline, "isOffline").to.be.false;
			expect(roff.isOnlineUnknown, "isOnlineUnknown").to.be.false;
			roff.forceOffline();
			expect(roff.isForcedOffline, "isForcedOffline").to.be.true;
			expect(roff.isOnline, "isOnline").to.be.false;
			expect(roff.isOffline, "isOffline").to.be.true;
			expect(roff.isOnlineUnknown, "isOnlineUnknown").to.be.false;
			roff.forceOnline();
			expect(roff.isForcedOffline, "isForcedOffline").to.be.false;
			expect(roff.isOnline, "isOnline").to.be.false;
			expect(roff.isOffline, "isOffline").to.be.false;
			expect(roff.isOnlineUnknown, "isOnlineUnknown").to.be.true;
		});
	});

	it("02: should create an empty repository when first accessed and offline", function() {
		var roff = restoff();
		roff.forceOffline();

		return roff.get("http://test.development.com:4050/testsweb/testdata/addresses")
		.then(function(result){
			expect(roff.isForcedOffline, "isForcedOffline").to.be.true;
			expect(roff.isOnline, "isOnline").to.be.false;
			expect(roff.isOffline, "isOffline").to.be.true;
			expect(roff.isOnlineUnknown, "isOnlineUnknown").to.be.false;
			expect(result, "Empty object").to.deep.equals([]);
		});
	});

	// Actual offline test: Comment out this code and make sure your internet
	// connection is turned off
	// it("should work offline when it is 'really' offline", function() {
	// 	var roff = restoff();

	// 	return roff.get("http://jsonplaceholder.typicode.com/posts").then(function(result){
	// 		expect(true, "Promise should call the catch.", false);			
	// 	}).catch(function (error) {
	// 		var errorExpected = {
	// 			message: "Network Error",
	// 			messageDetail: "",
	// 			status: 0,
	// 			uri: "http://jsonplaceholder.typicode.com/posts"
	// 		};
	// 		expect(roff.isForcedOffline, "isForcedOffline").to.be.false;
	// 		expect(roff.isOnline, "isOnline").to.be.false;
	// 		expect(roff.isOffline, "isOffline").to.be.true;
	// 		expect(roff.isOnlineUnknown, "isOnlineUnknown").to.be.false;
	// 		expect(error, "Offlinedata").to.deep.equals(errorExpected);
	// 	});
	// });

});

