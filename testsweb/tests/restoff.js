describe ("restoff", function() {

	function testLog(text) {
		if (false) {
			console.log(text);
		}
	}

	function testUri(path) {
		return "http://test.development.com:3000/" + path;
	}

	// function testSetup(testid) {
	// 	return new Promise(function(resolve, reject) {
	// 		var user = {
	// 			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68578",
	// 			"first_name": "Happy",
	// 			"last_name": "User"
	// 		};

	// 		var address = {
	// 			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68579",
	// 			"address": "1347 Pacific Avenue, Suite 201",
	// 			"city": "Santa Cruz",
	// 			"state": "CA",
	// 			"zip": "95060"
	// 		};

	// 		var userRepo = "users" + testid;
	// 		var addressRepo = "addresses" + testid;

	// 		testdb = restoff();
	// 		users = testdb.post(testUri(userRepo), user).then(function(users) {
	// 			testLog(userRepo + " created");
	// 			addresses = testdb.post(testUri(addressRepo), address).then(function(addresses) {
	// 				testLog(addressRepo + " created");
	// 				resolve(testdb);
	// 			});
	// 		});
	// 	});
	// }

	// function testTearDown(testdb, testid) {
	// 	return new Promise(function(resolve, reject) {
	// 		var userRepo = "users" + testid;
	// 		var addressRepo = "addresses" + testid;

	// 		testdb.delete(testUri(userRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68578")).then(function(result) {
	// 			testdb.delete(testUri(addressRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68579")).then(function(result2) {
	// 				testLog("Database cleaned out for " + testid);
	// 				resolve();
	// 			});
	// 		});
	// 	});
	// }

	it("01: should not wipeout Object prototype and be a restoff", function() {
		expect(restoff, "restoff").to.not.eql(undefined);

		var roff = restoff();

		expect(roff, "roff").to.have.property('toString');
		expect(roff, "roff").to.have.property('isOnline');
		expect(roff.ONLINE_UNKNOWN, "ONLINE_UNKNOWN").to.equal(null);
		expect(roff.ONLINE, "ONLINE").to.equal(true);
		expect(roff.ONLINE_NOT, "ONLINE_NOT").to.equal(false);
	});

	it("02: should be offline initially", function() {
		var roff = restoff();
		expect(roff.isOnline, "isOnline").to.equal(roff.ONLINE_UNKNOWN);
		expect(roff.isForcedOffline, "isForcedOffline ").to.be.false;
	});

	it("03: should handle config settings correctly", function() {
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
	
	it("04: should access a valid endpoint while connected\
		and return back a javascript object", function() {
		var dbSource = restoff();
		var roff = restoff();
		var testid = "01";
		var userRepo = "users" + testid;

		// return testSetup(testid).then(function(dbSource) {
			return dbSource.get(testUri(userRepo)).then(function(source) {
				expect(dbSource.repository[userRepo].length, userRepo + " repository length").to.equal(1);
				expect(dbSource.repository[userRepo].length, userRepo + " repository count ").to.equal(1);
				return roff.get(testUri(userRepo)).then(function(result){
					expect(result, "User result").to.deep.equals(source);
					expect(roff.isOnline, "isOnline").to.equal(roff.ONLINE);
					// return testTearDown(dbSource, testid);
				});
			}).catch(function(error) {
				expect(true, "Did you run gulp restserver?").to.equal.false;
			});
		// });
	});

	it("05: should handle an invalid endpoint while connected", function() {
		return restoff().get("http://test.development.com:4000/testsweb/testdata/user02.json").then(function(result) {
				expect(true,"Catch promise should execute.").to.equal(false);
			}).catch(function(error) {
				var errorExpected = {
					message: "Network Error",
					messageDetail: "",
					status: 0,
					uri: "http://test.development.com:4000/testsweb/testdata/user02.json"
				};
				expect(error, "Error result").to.deep.equals(errorExpected);
			})
		;
	});

	it("06: should store a RESTful call to the local repository, \
		figure out correct repository name and\
		the RESTful call should still work even when offline\
		.", function() {
		var dbSource = restoff();
		var roff = restoff();
		var testid = "01"; // 02
		var userRepo = "users" + testid;

		expect(Object.keys(roff.repository).length, "Repository length").to.equal(0);
		// return testSetup(testid).then(function(dbSource) {
			return dbSource.get(testUri(userRepo)).then(function(source) {
				expect(dbSource.repository[userRepo].length, userRepo + " repository length").to.equal(1);
				return roff.get(testUri(userRepo)).then(function(users){
					expect(users, userRepo + " object").to.deep.equals(source);
					expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
					expect(roff.repository[userRepo], userRepo + " object").to.deep.equals(source);
					roff.forceOffline();
					return roff.get(testUri(userRepo)).then(function(users2) {
							expect(users2, userRepo + " object").to.deep.equals(source);
							expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
							expect(roff.repository[userRepo], userRepo + " object").to.deep.equals(source);
							// return testTearDown(dbSource, testid);
					});
				});
			});
		// });
	});

	it("07: should support a non-standard RESTful api", function() {
		var roff = restoff({
			"rootUri" : "http://test.development.com:4050/testsweb/testdata"
		});

		var address01 = [];
		address01.push(
		{
			"guid": "aedfa7a4-d748-11e5-b5d2-0a1d41d68579",
			"address": "1347 Pacific Avenue, Suite 201",
			"city": "Santa Cruz",
			"zip": "95060"
		});

		return roff.get("http://test.development.com:4050/testsweb/testdata/addresses").then(function(addresses){
			expect(addresses, "Address object").to.deep.equals(address01);
			expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
			expect(roff.repository["addresses"], "Address object").to.deep.equals(address01);
		});

	});

	it("08: should support more than one repository", function() {
		var dbSource = restoff();
		var testid = "01"; // 03
		var userRepo = "users" + testid;
		var addressRepo = "addresses" + testid;

		// return testSetup(testid).then(function(dbSource) {
			return dbSource.get(testUri(userRepo)).then(function(users) {
				return dbSource.get(testUri(addressRepo)).then(function(addresses){
					expect(Object.keys(dbSource.repository).length, "Repository length").to.equal(2);
					expect(dbSource.repository[userRepo].length, userRepo + " repository length").to.equal(1);
					expect(dbSource.repository[addressRepo].length, addressRepo + " repository length").to.equal(1);
					expect(dbSource.repository[userRepo], userRepo + " object").to.deep.equals(users);
					expect(dbSource.repository[addressRepo], addressRepo + " object").to.deep.equals(addresses);
					// return testTearDown(dbSource, testid);
				});
			});
		// });
	});

	it("09: should be able to clear a repository leaving an 'empty' repository\
		and not add a repository if it exists\
		and not delete any data from the actual data source.", function() {
		var roff = restoff();
		var testid = "01"; // 04
		var userRepo = "users" + testid;

		expect(Object.keys(roff.repository).length, "Repository length").to.equal(0);
		// return testSetup(testid).then(function(dbSource) {
			return roff.get(testUri(userRepo)).then(function(users){
				expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
				expect(roff.repository[userRepo].length, userRepo + " repository length").to.equal(1);
				expect(roff.repository[userRepo], userRepo + " object").to.deep.equals(users);
				roff.clearCacheBy(userRepo);
				expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
				expect(roff.repository[userRepo], userRepo + " object").to.deep.equals([]);
				roff.clearCacheBy("not_a_repo");
				expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
				
				// Verify we did not delete any data from actual data source
				var dbSource = restoff();
				return dbSource.get(testUri(userRepo)).then(function(users){
					expect(Object.keys(dbSource.repository).length, "Repository length").to.equal(1);
					expect(dbSource.repository[userRepo].length, userRepo + " repository length").to.equal(1);
					expect(dbSource.repository[userRepo], userRepo + " object").to.deep.equals(users);
					// return testTearDown(dbSource, testid);
				});
			});
		// });
	});

	it("10: should be able to clear all repositories leaving an 'empty' repository\
		but not delete actual data on the backend.", function() {
		var dbSource = restoff();			
		var testid = "01"; // 05
		var userRepo = "users" + testid;
		var addressRepo = "addresses" + testid;		

		// return testSetup(testid).then(function(dbSource) {
			return dbSource.get(testUri(userRepo)).then(function(users) {
				return dbSource.get(testUri(addressRepo)) .then(function(addresses){
					expect(Object.keys(dbSource.repository).length, "Repository length").to.equal(2);
					expect(dbSource.repository[userRepo].length, userRepo + " repository length").to.equal(1);
					expect(dbSource.repository[userRepo], userRepo + " object").to.deep.equals(users);
					expect(dbSource.repository[addressRepo].length, userRepo + " repository length").to.equal(1);
					expect(dbSource.repository[addressRepo], addressRepo + " object").to.deep.equals(addresses);
					dbSource.clearCacheAll();
					expect(Object.keys(dbSource.repository).length, "Repository length").to.equal(2);
					expect(dbSource.repository[userRepo], userRepo + " object").to.deep.equals([]);
					expect(dbSource.repository[addressRepo], addressRepo + " object").to.deep.equals([]);
					// return testTearDown(dbSource, testid);
				});
			});
		// });
	});

	it("11: should support adding parameters automatically\
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

		var testid = "01"; // 06
		var userRepo = "users" + testid;

		// return testSetup(testid).then(function(dbSource) {
			return roff.get(testUri(userRepo)).then(function(users){
				expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
				expect(roff.repository[userRepo], userRepo  + " object").to.deep.equals(users);
				// return testTearDown(roff, testid);
			});
		// });

	});

	it("12: should support adding headers automatically", function() {
		var roff = restoff().autoHeaderParam("access_token", "rj5aabcea");

		expect(roff, "roff").to.be.an('object');
		expect(roff.autoHeaderParamGet("access_token"), "access_token").to.equal("rj5aabcea");

		var testid = "01"; // 07 
		var userRepo = "users" + testid;

		// return testSetup(testid).then(function(dbSource) {
			return roff.get(testUri(userRepo)).then(function(users){
				expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
				expect(roff.repository[userRepo], userRepo + " object").to.deep.equals(users);
				// return testTearDown(dbSource, testid);
			});
		// });
	});	

});

