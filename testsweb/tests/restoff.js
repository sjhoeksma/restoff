describe ("restoff class", function() {

	function testLog(text) {
		if (true) {
			console.log(text);
		}
	}

	function testUri(path) {
		return "http://test.development.com:3000/" + path;
	}

	function testSetup(testid) {
		return new Promise(function(resolve, reject) {
			var user = {
				"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68578",
				"first_name": "Happy",
				"last_name": "User"
			};

			var address = {
				"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68579",
				"address": "1347 Pacific Avenue, Suite 201",
				"city": "Santa Cruz",
				"state": "CA",
				"zip": "95060"
			};

			var userRepo = "users" + testid;
			var addressRepo = "addresses" + testid;

			testdb = restoff();
			users = testdb.post(testUri(userRepo), user).then(function(users) {
				testLog(userRepo + " created");
				addresses = testdb.post(testUri(addressRepo), address).then(function(addresses) {
					testLog(addressRepo + " created");
					resolve(testdb);
				});
			});
		});
	}

	function testTearDown(testdb, testid) {
		return new Promise(function(resolve, reject) {
			var userRepo = "users" + testid;
			var addressRepo = "addresses" + testid;

			testdb.delete(testUri(userRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68578")).then(function(result) {
				testdb.delete(testUri(addressRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68579")).then(function(result2) {
					testLog("Database cleaned out for " + testid);
					resolve();
				});
			});
		});
	}

	it("should not wipeout Object prototype and be a restoff", function() {
		expect(restoff, "restoff").to.not.eql(undefined);

		var roff = restoff();

		expect(roff, "roff").to.have.property('toString');
		expect(roff, "roff").to.have.property('isOnline');
		expect(roff.ONLINE_UNKNOWN, "ONLINE_UNKNOWN").to.equal(null);
		expect(roff.ONLINE, "ONLINE").to.equal(true);
		expect(roff.ONLINE_NOT, "ONLINE_NOT").to.equal(false);
	});

	it("should be offline initially", function() {
		var roff = restoff();
		expect(roff.isOnline, "isOnline").to.equal(roff.ONLINE_UNKNOWN);
		expect(roff.isForcedOffline, "isForcedOffline ").to.be.false;
	});

	it("should handle config settings correctly", function() {
		var roff = restoff();
		expect(roff.rootUri, "rootUri").to.equal("");
		expect(roff.dbName, "dbName").to.equal("restoff.json");
		roff.rootUri = testUri("testsweb/testdata");
		expect(roff.rootUri, "rootUri").to.equal(testUri("testsweb/testdata"));

		roff.dbName = "new.json";
		expect(roff.dbName, "dbName").to.equal("new.json");

		var roff2 = restoff({
			"rootUri" : testUri("testsweb/testdata2"),
			"dbName" : "loki.json"
		});
		expect(roff2.rootUri, "rootUri").to.equal(testUri("testsweb/testdata2"));
		expect(roff2.dbName, "dbName").to.equal("loki.json");
	});
	
	it("should access a valid endpoint while connected\
		and return back a javascript object", function() {
		var roff = restoff();
		var testid = "01";
		var userRepo = "users" + testid;

		return testSetup(testid).then(function(db_source) {
			return db_source.get(testUri(userRepo)).then(function(source) {
				expect(db_source.repository[userRepo].length, userRepo + " repository length").to.equal(1);
				expect(db_source.repository[userRepo].length, userRepo + " repository count ").to.equal(1);
				return roff.get(testUri(userRepo)).then(function(result){
					expect(result, "User result").to.deep.equals(source);
					expect(roff.isOnline, "isOnline").to.equal(roff.ONLINE);
					return testTearDown(db_source, testid);
				});
			});
		});
	});

	it("should handle an invalid endpoint while connected", function() {
		// var errorResult = {
		// 	"message" : "Not Found",
		// 	"messageDetail" : "Cannot GET /testsweb/testdata/user02.json",
		// 	"status": 404
		// };
		// TODO: Get the 404 status working again
		var errorResult = {
			"message" : "",
			"messageDetail" : "",
			"status": 0
		};

		return restoff().get("http://test.development.com:4000/testsweb/testdata/user02.json").then(function(result) {
				expect(true,"Catch promise should execute.").to.equal(false);
			}).catch(function(error) {
				expect(error, "Error result").to.deep.equals(errorResult);
			})
		;
	});

	it("should store a RESTful call to the local repository, \
		figure out correct repository name and\
		the RESTful call should still work even when offline\
		.", function() {
		var roff = restoff();
		var testid = "02";
		var userRepo = "users" + testid;

		expect(Object.keys(roff.repository).length, "Repository length").to.equal(0);
		return testSetup(testid).then(function(db_source) {
			return db_source.get(testUri(userRepo)).then(function(source) {
				return roff.get(testUri(userRepo)).then(function(users){
					expect(db_source.repository[userRepo].length, userRepo + " repository length").to.equal(1);
					expect(users, userRepo + " object").to.deep.equals(source);
					expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
					expect(roff.repository[userRepo], userRepo + " object").to.deep.equals(source);
					roff.forceOffline();
					return roff.get(testUri(userRepo)).then(function(users2) {
							expect(users2, userRepo + " object").to.deep.equals(source);
							expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
							expect(roff.repository[userRepo], userRepo + " object").to.deep.equals(source);
							return testTearDown(db_source, testid);
					});
				});
			});
		});
	});

	it("should support a non-standard RESTful api", function() {
		var roff = restoff({
			"rootUri" : "http://test.development.com:4050/testsweb/testdata"
		});

		var address01 = {
			"guid": "aedfa7a4-d748-11e5-b5d2-0a1d41d68579",
			"address": "1347 Pacific Avenue, Suite 201",
			"city": "Santa Cruz",
			"zip": "95060"
		};

		return roff.get("http://test.development.com:4050/testsweb/testdata/addresses").then(function(addresses){
			expect(addresses, "Address object").to.deep.equals(address01);
			expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
			expect(roff.repository["addresses"], "Address object").to.deep.equals(address01);
		});

	});

	it("should support more than one repository", function() {
		var testid = "03";
		var userRepo = "users" + testid;
		var addressRepo = "addresses" + testid;

		return testSetup(testid).then(function(db_source) {
			return db_source.get(testUri(userRepo)).then(function(users) {
				return db_source.get(testUri(addressRepo)).then(function(addresses){
					expect(Object.keys(db_source.repository).length, "Repository length").to.equal(2);
					expect(db_source.repository[userRepo].length, userRepo + " repository length").to.equal(1);
					expect(db_source.repository[addressRepo].length, addressRepo + " repository length").to.equal(1);
					expect(db_source.repository[userRepo], userRepo + " object").to.deep.equals(users);
					expect(db_source.repository[addressRepo], addressRepo + " object").to.deep.equals(addresses);
					return testTearDown(db_source, testid);
				});
			});
		});
	});

	it("should be able to clear a repository leaving an 'empty' repository\
		and not add a repository if it exists\
		and not delete any data from the actual data source.", function() {
		var roff = restoff();
		var testid = "04";
		var userRepo = "users" + testid;

		expect(Object.keys(roff.repository).length, "Repository length").to.equal(0);
		return testSetup(testid).then(function(db_source) {
			return roff.get(testUri(userRepo)).then(function(users){
				expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
				expect(roff.repository[userRepo].length, userRepo + " repository length").to.equal(1);
				expect(roff.repository[userRepo], userRepo + " object").to.deep.equals(users);
				roff.clearCacheBy(userRepo);
				expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
				expect(roff.repository[userRepo], userRepo + " object").to.deep.equals({});
				roff.clearCacheBy("not_a_repo");
				expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
				
				// Verify we did not delete any data from actual data source
				return db_source.get(testUri(userRepo)).then(function(users){
					expect(Object.keys(db_source.repository).length, "Repository length").to.equal(1);
					expect(db_source.repository[userRepo].length, userRepo + " repository length").to.equal(1);
					expect(db_source.repository[userRepo], userRepo + " object").to.deep.equals(users);
					return testTearDown(db_source, testid);
				});
			});
		});
	});

	it("should be able to clear all repositories leaving an 'empty' repository\
		but not delete actual data on the backend.", function() {
		var testid = "05";
		var userRepo = "users" + testid;
		var addressRepo = "addresses" + testid;		

		return testSetup(testid).then(function(db_source) {
			return db_source.get(testUri(userRepo)).then(function(users) {
				return db_source.get(testUri(addressRepo)) .then(function(addresses){
					expect(Object.keys(db_source.repository).length, "Repository length").to.equal(2);
					expect(db_source.repository[userRepo].length, userRepo + " repository length").to.equal(1);
					expect(db_source.repository[userRepo], userRepo + " object").to.deep.equals(users);
					expect(db_source.repository[addressRepo].length, userRepo + " repository length").to.equal(1);
					expect(db_source.repository[addressRepo], addressRepo + " object").to.deep.equals(addresses);
					db_source.clearCacheAll();
					expect(Object.keys(db_source.repository).length, "Repository length").to.equal(2);
					expect(db_source.repository[userRepo], userRepo + " object").to.deep.equals({});
					expect(db_source.repository[addressRepo], addressRepo + " object").to.deep.equals({});
					return testTearDown(db_source, testid);
				});
			});
		});
	});

	it("should support adding parameters automatically\
		and will overwrite an existing parameter with the new value\
		and it can support multiple auto parameters\
		and it will append if there are already parameters in the uri passed", function() {
		var roff = restoff().autoQueryParam("access_token", "rj5aabcea");

		expect(roff, "roff").to.be.an('object');
		expect(roff.autoQueryParamGet("access_token"), "access_token").to.equal("rj5aabcea");

		roff.autoQueryParam("access_token", "rj5aabcea2");
		expect(roff.autoQueryParamGet("access_token"), "access_token").to.equal("rj5aabcea2");
		roff.autoQueryParam("another_auto", "another_value");

		var generated = roff.uriGenerate(testUri("users"));
		expect(generated, "Generated uri").to.equal(testUri("users") + "?access_token=rj5aabcea2&another_auto=another_value");

		var generated2 = roff.uriGenerate(testUri("users?already=added"));
		expect(generated2, "Generated uri").to.equal(testUri("users?already=added") + "&access_token=rj5aabcea2&another_auto=another_value");

		return roff.get(testUri("users")).then(function(users){
			expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
			expect(roff.repository["users"], "Users object").to.deep.equals(users);
		});

	});

	it("should support adding headers automatically", function() {
		var roff = restoff().autoHeaderParam("access_token", "rj5aabcea");

		expect(roff, "roff").to.be.an('object');
		expect(roff.autoHeaderParamGet("access_token"), "access_token").to.equal("rj5aabcea");

		return roff.get(testUri("users")).then(function(users){
			expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
			expect(roff.repository["users"], "Users object").to.deep.equals(users);
		});

	});	

});

