describe ("running web specific tests - offline", function() {

	beforeEach(function() {
	});

	it("should set isOnline to false when isForcedOffline is set to true", function() {
		var roff = restoff();
		return roff.get("http://test.development.com:4050/testsweb/testdata/user01.json")
		.then(function(result){
			expect(roff.isOnline).to.be.true;
			expect(roff.isForcedOffline).to.be.false;
			roff.forcedOffline = true;
			expect(roff.isOnline).to.be.false;
			expect(roff.isForcedOffline).to.be.true;
		});
	});

	it("should support simulating offline", function() {
		var roff = restoff();
		roff.forcedOffline = true;
		var offlineData = {
			"offlineData": true
		};

		return roff.get("http://test.development.com:4050/testsweb/testdata/user01.json")
		.then(function(result){
			expect(roff.isForcedOffline).to.be.true;
			expect(roff.isOnline).to.be.false;
			expect(result).to.deep.equals(offlineData);
		});
	});

	// // Actual offline test: Comment out this code and make sure your internet
	// // connection is turned off
	// it("should work when it is really offline", function() {
	// 	var roff = restoff();
	// 	var offlineData = {
	// 		"offlineData": true
	// 	};

	// 	return roff.get("http://jsonplaceholder.typicode.com/posts")
	// 	.then(function(result){
	// 		expect(roff.isForcedOffline).to.be.false;
	// 		expect(roff.isOnline).to.be.false;
	// 		expect(result).to.deep.equals(offlineData);
	// 	});
	// });	

});

