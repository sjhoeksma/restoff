describe ("running web specific tests", function() {

	var user01 = {
		"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68578",
		"first_name": "Happy",
		"last_name": "User"
	};

	var address01 = {
		"guid": "aedfa7a4-d748-11e5-b5d2-0a1d41d68579",
		"address": "1347 Pacific Avenue, Suite 201",
		"city": "Santa Cruz",
		"zip": "95060"
	};

	var emailaddress01 = {
		"guid": "aedfa7a4-d748-11e5-b5d2-0a1d41d6857A",
		"emailaddress": "awesome@cool.com"
	};

	it("should not wipeout Object prototype and be a restoff", function() {
		expect(restoff).to.not.eql(undefined);

		var roff = restoff();
		expect(roff).to.have.property('toString');
		expect(roff).to.have.property('isOnline');
		expect(roff.ONLINE_UNKNOWN).to.equal(null);
		expect(roff.ONLINE).to.equal(true);
		expect(roff.ONLINE_NOT).to.equal(false);
	});

	it("should be offline initially", function() {
		var roff = restoff();
		expect(roff.isOnline).to.equal(roff.ONLINE_UNKNOWN);
		expect(roff.isForcedOffline).to.be.false;
	});

	it("should handle config settings correctly", function() {
		var roff = restoff();
		expect(roff.rootUri).to.equal("");
		roff.rootUri = "http://test.development.com:4050/testsweb/testdata";
		expect(roff.rootUri).to.equal("http://test.development.com:4050/testsweb/testdata");

		var roff2 = restoff({
			"rootUri" : "http://test.development.com:4050/testsweb/testdata2"
		});
		expect(roff2.rootUri).to.equal("http://test.development.com:4050/testsweb/testdata2");

	});
	
	it("should access a valid endpoint while connected", function() {
		var roff = restoff();

		return roff.get("http://test.development.com:4050/testsweb/testdata/users")
		.then(function(result){
			expect(result).to.deep.equals(user01);
			expect(roff.isOnline).to.equal(roff.ONLINE);
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

	it("should store a RESTful call to the local repository, \
		figure out correct repository name and\
		the RESTful call should still work even when offline.", function() {
		var roff = restoff({
			"rootUri" : "http://test.development.com:4050/testsweb/testdata"
		});
		expect(Object.keys(roff.repository).length).to.equal(0);
		return roff.get("http://test.development.com:4050/testsweb/testdata/users")
			.then(function(result){
				expect(result).to.deep.equals(user01);
				expect(Object.keys(roff.repository).length).to.equal(1);
				expect(roff.repository["users"]).to.deep.equals(user01);
				roff.forceOffline();
				roff.get("http://test.development.com:4050/testsweb/testdata/users")
					.then(function(result) {
						expect(result).to.deep.equals(user01);
						expect(Object.keys(roff.repository).length).to.equal(1);
						expect(roff.repository["users"]).to.deep.equals(user01);
					});
			});
	});

	it("should support the default rootUri of protocol + hostname when a rootUri is not set", function() {
		var roff = restoff();
		return roff.get("http://test.development.com:4050/emailaddresses")
			.then(function(result){
				expect(result).to.deep.equals(emailaddress01);
				expect(Object.keys(roff.repository).length).to.equal(1);
				expect(roff.repository["emailaddresses"]).to.deep.equals(emailaddress01);
			});

	});


	it("should support more than one repository", function() {
		var roff = restoff({
			"rootUri" : "http://test.development.com:4050/testsweb/testdata"
		});
		expect(Object.keys(roff.repository).length).to.equal(0);
		roff.get("http://test.development.com:4050/testsweb/testdata/users");
		return roff.get("http://test.development.com:4050/testsweb/testdata/addresses")
			.then(function(result){
				expect(result).to.deep.equals(address01);
				expect(Object.keys(roff.repository).length).to.equal(2);
				expect(roff.repository["users"]).to.deep.equals(user01);
				expect(roff.repository["addresses"]).to.deep.equals(address01);
				// TODO: Hit a backend and make sure data was not deleted
			});
	});


	it("should be able to clear a repository leaving an 'empty' repository\
		and not add a repository if it exists.", function() {
		var roff = restoff({
			"rootUri" : "http://test.development.com:4050/testsweb/testdata"
		});
		expect(Object.keys(roff.repository).length).to.equal(0);
		return roff.get("http://test.development.com:4050/testsweb/testdata/users")
			.then(function(result){
				expect(Object.keys(roff.repository).length).to.equal(1);
				expect(roff.repository["users"]).to.deep.equals(user01);
				roff.clearCacheBy("users");
				expect(Object.keys(roff.repository).length).to.equal(1);
				expect(roff.repository["users"]).to.deep.equals({});
				roff.clearCacheBy("not_a_repo");
				expect(Object.keys(roff.repository).length).to.equal(1);
				// TODO: Hit a backend and make sure data was not deleted
			});
	});

	it("should be able to clear all repositories leaving an 'empty' repository\
		but not delete actual data on the backend.", function() {
		var roff = restoff({
			"rootUri" : "http://test.development.com:4050/testsweb/testdata"
		});
		expect(Object.keys(roff.repository).length).to.equal(0);
		roff.get("http://test.development.com:4050/testsweb/testdata/users");
		return roff.get("http://test.development.com:4050/testsweb/testdata/addresses")
			.then(function(result){
				expect(Object.keys(roff.repository).length).to.equal(2);
				expect(roff.repository["users"]).to.deep.equals(user01);
				expect(roff.repository["addresses"]).to.deep.equals(address01);
				roff.clearCacheAll();
				expect(Object.keys(roff.repository).length).to.equal(2);
				expect(roff.repository["users"]).to.deep.equals({});
				expect(roff.repository["addresses"]).to.deep.equals({});
			});
	});


});
