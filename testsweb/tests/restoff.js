describe ("restoff", function() {

	var ROOT_URI = "http://test.development.com:3000/";

	function testLog(text) {
		if (false) {
			console.log(text);
		}
	}

	it("01: getshould not wipeout Object prototype and be a restoff", function() {
		var roff = restoff();
		expect(restoff, "restoff").to.be.an("function");
		expect(roff, "restoff").to.be.an("object");
	});

	it("02: should start out as being unknown\
		    for online/offline status", function() {
		var roff = restoff();
		onlineStatusShouldEqual(roff, false, false, true, false);
	});

	it("03: should handle config settings correctly", function() {
		var roff = restoff();
		expect(roff.dbRepo, "dbRepo").to.be.an("object");

		expect(roff.rootUri, "rootUri").to.equal("");
		roff.rootUri = ROOT_URI;
		expect(roff.rootUri, "rootUri").to.equal(ROOT_URI);

		expect(roff.primaryKeyName, "primaryKeyName").to.equal("id");
		roff.primaryKeyName = "id3";
		expect(roff.primaryKeyName, "primaryKeyName").to.equal("id3");

		var roff2 = restoff({
			"primaryKeyName" : "id2",
			"rootUri" : ROOT_URI,
			"dbRepo" : lowdbRepo({
				"dbName" : "TestDb"
			})
		});
		
		expect(roff2.dbRepo.dbName, "repo.dbName").to.equal("TestDb");
		expect(roff2.rootUri, "rootUri").to.equal(ROOT_URI);
		expect(roff2.primaryKeyName, "primaryKeyName").to.equal("id2");
	});

	it("04: should, when online, get multiple resources\
		    and store them on the client,\
		    clear a single repository\
			support a rootUri configuration,\
		    have corrct online statuses\
		    and still be available when offline", function() {
		var userRepo = "users11";
		var roff = restoff({ "rootUri" : ROOT_URI });
		roff.dbRepo.clear(userRepo);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
		onlineStatusShouldEqual(roff, false, false, true, false);
		return roff.get(userRepo).then(function(result) {
			onlineStatusShouldEqual(roff, true, false, false, false);
			dbRepoShouldBeEqual(roff, userRepo, result, 3);
			return dbRepoExactlyEqual(roff, userRepo).then(function(result) {
				expect(result, "db repo the same").to.be.true;
				roff.forceOffline();
				onlineStatusShouldEqual(roff, false, false, true, true);
				return roff.get(userRepo).then(function(result){
					dbRepoShouldBeEqual(roff, userRepo, result, 3);
					onlineStatusShouldEqual(roff, false, true, false, true);
				});
			});
		});
	});

	it("05: should, when online, get a single resources,\
			clear multiple repositories\
		    and store it on the client.\
		    should use full uri if passed", function() {
		var userRepo = "users12";
		var userRepo2 = "users11";
		var roff = restoff({ "rootUri" : ROOT_URI });
		roff.dbRepo.clearAll();
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
		return roff.get(ROOT_URI + userRepo).then(function(result) {
			dbRepoShouldBeEqual(roff, userRepo, result, 1);
			return roff.get(userRepo2).then(function(result2){
				dbRepoShouldBeEqual(roff, userRepo2, result2, 3);
				dbRepoShouldBeEqual(roff, userRepo, result, 1);
				return dbRepoExactlyEqual(roff, userRepo).then(function(result) {
					expect(result, "db repo the same").to.be.true;
					roff.dbRepo.clearAll();
					dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
				});

			});
		});
	});

	it("06: should, when online, handle network errors", function() {
		var roff = restoff();
		roff.dbRepo.clearAll();

		return roff.get("http://idontexisthopefully.com").then(function(result) {
			expect(true, "Promise should call the catch.").to.be.false;			
		}).catch(function(error) {
			var errorExpected = {
				message: "Network Error",
				messageDetail: "",
				status: 0,
				uri: "http://idontexisthopefully.com"
			};
			expect(error, "Error result").to.deep.equals(errorExpected);
			onlineStatusShouldEqual(roff, false, false, true, false);
		});
	});

	it("07: should, when online, handle 404\
		    and when offline create a repository", function() {
		var userRepo = "users100";

		var roff = restoff({
			"rootUri" : ROOT_URI
		});
		roff.dbRepo.clearAll();

		return roff.get(userRepo).then(function(result) {
			expect(true, "Promise should call the catch.").to.be.false;			
		}).catch(function(error) {
			var errorExpected = {
				message: "Not Found",
				messageDetail: "{}",
				status: 404,
				uri: "http://test.development.com:3000/"+userRepo
			};
			expect(error, "Error result").to.deep.equals(errorExpected);
			onlineStatusShouldEqual(roff, true, false, false, false);
			roff.forceOffline();

		});
	});

	it("08: should support enabling and disabling of the\
			persistance engine. No information should be\
			persisted on a get. When offline, nothing should\
			be retrieved.", function() {
		// TODO: Add Post, Delete, Put
		var roffParam = restoff();

		expect(roffParam.persistanceDisabled, "persistanceDisabled").to.equal(false);
		expect(roffParam.dbRepo, "dbRepo").to.be.an("object");
		roffParam.persistanceDisabled = true;
		expect(roffParam.persistanceDisabled, "persistanceDisabled").to.equal(true);
		expect(roffParam.dbRepo, "dbRepo").to.be.null;
		roffParam.persistanceDisabled = false;
		expect(roffParam.dbRepo, "dbRepo").to.be.an("object");

		var roffParam2 = restoff({
			"persistanceDisabled" : true
		});
		
		expect(roffParam2.persistanceDisabled, "persistanceDisabled").to.equal(true);

		var userRepo = "users11";
		var roff = restoff({
			"rootUri" : ROOT_URI,
			"persistanceDisabled" : false // to run clear and read db results
		});
		roff.dbRepo.clear(userRepo);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
		roff.persistanceDisabled = true;
		return roff.get(userRepo).then(function(result) {
			roff.persistanceDisabled = false; // to read db results
			dbRepoShouldBeEmptyAndResourceNotEmpty(roff, userRepo, result);
			roff.persistanceDisabled = true;
			roff.forceOffline();
			return roff.get(userRepo).then(function(result2) {
				roff.persistanceDisabled = false; // to read db results
				dbRepoShouldBeEqual(roff, userRepo, result2, 0); // when offline repo is also empty
			});
		});

	});

	it("09: should support a non-standard RESTful api,\
			non-standard primaryKeyName,\
			and a single non-array resource: not [{ object }] but {object } ", function() {
		var roff = restoff({
			"rootUri" : "http://test.development.com:4050/testsweb/testdata/",
			"primaryKeyName" : "guid"
		});
		return roff.get("http://test.development.com:4050/testsweb/testdata/addresses").then(function(addresses) {
			dbRepoShouldBeEqual(roff, "addresses", addresses, 1);
		});
	});	

	it("10: should support more than one repository", function() {
		var roff = restoff({ "rootUri" : ROOT_URI });
		var userRepo = "users11";
		var addressRepo = "addresses01";

		return roff.get(userRepo).then(function(users) {
			return roff.get(addressRepo).then(function(addresses){
				dbRepoShouldBeEqual(roff, addressRepo, addresses, 1);
				dbRepoShouldBeEqual(roff, userRepo, users, 3);
			});
		});
	});

	it("11: should support adding parameters automatically\
		and will overwrite an existing parameter with the new value\
		and it can support multiple auto parameters\
		and it will append if there are already parameters in the uri passed\
		and it will remove any uri parameters when figuring out a repo name", function() {
		var roff = restoff({
			"rootUri" : ROOT_URI
		}).autoQueryParamSet("access_token", "rj5aabcea");

		expect(roff, "roff").to.be.an('object');
		expect(roff.autoQueryParamGet("access_token"), "access_token").to.equal("rj5aabcea");

		roff.autoQueryParamSet("access_token", "rj5aabcea2");
		expect(roff.autoQueryParamGet("access_token"), "access_token").to.equal("rj5aabcea2");
		roff.autoQueryParamSet("another_auto", "another_value");

		var generated = roff.uriGenerate("users");
		expect(generated, "Generated uri").to.equal(ROOT_URI + "users?access_token=rj5aabcea2&another_auto=another_value");

		var generated2 = roff.uriGenerate("users?already=added");
		expect(generated2, "Generated uri").to.equal(ROOT_URI + "users?already=added&access_token=rj5aabcea2&another_auto=another_value");

		var userRepo = "users11";
		return roff.get(userRepo).then(function(users) {
			dbRepoShouldBeEqual(roff, userRepo, users, 3);
		});
	});

	it("12: should support adding headers automatically", function() {
		var roff = restoff({
			"rootUri" : ROOT_URI
		}).autoHeaderParamSet("access_token", "rj5aabcea");

		expect(roff, "roff").to.be.an('object');
		expect(roff.autoHeaderParamGet("access_token"), "access_token").to.equal("rj5aabcea");

		var userRepo = "users11";

		return roff.get(userRepo).then(function(users){
			dbRepoShouldBeEqual(roff, userRepo, users, 3);
		});
	});	

	// POST ------------------------------------------------------

	var newuser01 = {
		"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
		"first_name": "Happy3",
		"last_name": "User3"
	};

	var newusers = {};
	newusers["aedfa7a4-d748-11e5-b5d2-0a1d41d68577"] = newuser01;

	it("30: should, with a blank repo and when online,\
		    post a new resource to server and local repository", function() {
		var userRepo = "users02";
		var roff = restoff({ "rootUri" : ROOT_URI });
		var dbSource = restoff({ "rootUri" : ROOT_URI });

		roff.dbRepo.clear(userRepo);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

		return roff.post(userRepo, newuser01).then(function(updatedResult) {
			dbRepoShouldBeEqual(roff, userRepo, updatedResult, 1);

		// 	return dbSource.get(userRepo).then(function(result) {
		// 		console.log(roff.repositoryGet(userRepo));
		// 		console.log(newusers);
		// 		// expect(roff.repositoryGet(userRepo), userRepo + " repository equals").to.deep.equals(newusers);
		// 		// dbRepoShouldBeEqual(dbSource, restDb, userRepo, newusers, result, 1);
		// 		expect(dbSource.repositorySize, "Repository size").to.equal(1);
		// 		expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(result);
		// 		expect(dbResourceCompare(restDb, userRepo, newusers), userRepo + " resource should equal database").to.be.true;
		// 	});
		});
	});








	// Test Helpers

	function onlineStatusShouldEqual(roff, online, offline, unknown, forced) {
		expect(roff.isStatusOnline, "isStatusOnline").to.equal(online);
		expect(roff.isStatusOffline, "isStatusOffline").to.equal(offline);
		expect(roff.isStatusUnknown, "isStatusUnknown").to.equal(unknown);
		expect(roff.isForcedOffline, "isForcedOffline ").to.equal(forced);
	}


	function dbRepoShouldBeEmptyAndResourceNotEmpty(roff, repoName, resource) {
		expect(roff.dbRepo.length(repoName), repoName + " db length").to.equal(0);
		expect(resource.length, repoName + " repo length").to.not.equal(0);
	}

	function dbRepoShouldBeEqual(roff, repoName, resource, len) {
		var dbRepo = roff.dbRepo;
		expect(dbRepo.length(repoName), repoName + " repo and db length").to.equal(len);
		if (undefined !== resource)  {
			expect(dbResourceCompare(roff, repoName, resource), "db repo the same").to.be.true;
		}
	}

	function dbRepoExactlyEqual(roff, repoName) {
		var promise = new Promise(function(resolve, reject) {		
			// Verify client persisted database for repository is exactly equal
			// to the table/data in the servers database
			var roffDisabled = restoff({
				"rootUri" : ROOT_URI,			
				"persistanceDisabled" : true // Don't store the results anywhere
			});

			return roffDisabled.get(repoName).then(function(result) {
				roff.persistanceDisabled = false; // to read db results
				resolve(dbResourceCompare(roff, repoName, result));
			});
		});
		return promise;
	}

	function dbResourceCompare(roff, repoName, resources) {
		if (!(resources instanceof Array)) { // Make code easy: Always make it an array
			resources = [resources];
		}

		var dbSize = roff.dbRepo.length(repoName);
		if (dbSize !== resources.length) {
			console.log ("Expected dbSize of " + dbSize + " to equal resource size of " + resources.length + " for repository " + repoName + ".");
			return false;
		}



		resources.forEach(function(resource, position) {
			var primaryKey = roff.primaryKeyFor(resource);
			var dbResource = roff.dbRepo.find(repoName, roff.primaryKeyName, primaryKey);

			if (false === deepEqual(resource, dbResource)) {
				return false;
			}
		});

		return true;
	}

	function deepEqual(x, y) {
		if ((typeof x == "object" && x != null) && (typeof y == "object" && y != null)) {
			if (Object.keys(x).length != Object.keys(y).length) {
				return false;
			}

			for (var prop in x) {
				if (y.hasOwnProperty(prop)) {  
					if (! deepEqual(x[prop], y[prop])) {
						return false;
					}
				}
				else {
					return false;
				}
			}
		return true;
		} else if (x !== y) {
			return false;
		} else {
			return true;
		}
	}	

});

