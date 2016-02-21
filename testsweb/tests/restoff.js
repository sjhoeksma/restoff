describe ("running web specific tests", function() {

	it("should not wipeout Object prototype and be a restoff", function() {
		expect(restoff).to.not.eql(undefined);

		var roff = restoff();
		expect(roff).to.have.property('toString');
		expect(roff).to.have.property('isOnline');
	});

	it("should be offline initially", function() {
		var roff = restoff();
		expect(roff.isOnline).to.be.false;
		expect(roff.isForcedOffline).to.be.false;
	});

	it("should handle config settings correctly", function() {
		var roff = restoff();
		expect(roff.rootUri).to.equal("");
		roff.rootUri = "/root/uri";
		expect(roff.rootUri).to.equal("/root/uri");

		var roff2 = restoff({
			"rootUri" : "/root01/uri01"
		});
		expect(roff2.rootUri).to.equal("/root01/uri01");

	});
	
	it("should access a valid endpoint while connected", function() {
		var roff = restoff();
		var user01 = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68578",
			"first_name": "Happy",
			"last_name": "User"
		};

		return roff.get("http://test.development.com:4050/testsweb/testdata/users")
		.then(function(result){
			expect(result).to.deep.equals(user01);
			expect(roff.isOnline).to.be.true;
		});
	});

	it("should handle an invalid endpoint while connected", function() {
		var errorResult = {
			"message" : "Not Found",
			"messageDetail" : "Cannot GET /testsweb/testdata/user02.json",
			"status": 404
		};
		return restoff().get("http://test.development.com:4050/testsweb/testdata/user02.json")
		.catch(function(error) {
			expect(error).to.deep.equals(errorResult);
		});
	});

	it("should store RESTful call to local repository and figure out correct repository name", function() {
		var roff = restoff({
			"rootUri" : "/testsweb/testdata"
		});
		expect(Object.keys(roff.repository).length).to.equal(0);
		return roff.get("http://test.development.com:4050/testsweb/testdata/users")
		.then(function(result){
			expect(Object.keys(roff.repository).length).to.equal(1);
			expect(roff.repository["users"]).to.not.be.undefined;
		});

	});


});

