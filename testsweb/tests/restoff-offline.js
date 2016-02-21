describe ("running web specific tests - offline", function() {

	beforeEach(function() {
	});

	it("should set forceOffline correctly", function() {
		var roff = restoff();
		return roff.get("http://test.development.com:4050/testsweb/testdata/users")
		.then(function(result){
			expect(roff.isForcedOffline).to.be.false;
			expect(roff.isOnline).to.equal(roff.ONLINE);
			roff.forceOffline = true;
			expect(roff.isForcedOffline).to.be.true;
			expect(roff.isOnline).to.equal(roff.ONLINE_NOT);
		});
	});

	it("should create an empty repository when repository is first accessed while offline", function() {
		var roff = restoff();
		roff.forceOffline = true;

		return roff.get("http://test.development.com:4050/testsweb/testdata/users")
		.then(function(result){
			expect(roff.isForcedOffline).to.be.true;
			expect(roff.isOnline).to.equal(roff.ONLINE_NOT);
			expect(result).to.deep.equals({});
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
	// 		expect(roff.isForcedOffline).to.be.false;
	// 		expect(roff.isOnline).to.be.false;
	// 		expect(result).to.deep.equals(offlineData);
	// 	});
	// });	

});

