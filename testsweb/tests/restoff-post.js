describe ("restoff post", function() {

	var ROOT_URI = "http://test.development.com:3000/";

	var newuser01 = {
		"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
		"first_name": "Happy3",
		"last_name": "User3"
	};

	var newusers = {};
	newusers["aedfa7a4-d748-11e5-b5d2-0a1d41d68577"] = newuser01;

	it("01: should, when online, handle network errors", function() {
		return restoff().post("http://idontexisthopefully.com", newuser01).then(function(result) {
			expect(true, "Promise should call the catch.").to.be.false;			
		}).catch(function(error) {
			var errorExpected = {
				message: "Network Error",
				messageDetail: "",
				status: 0,
				uri: "http://idontexisthopefully.com"
			};
			expect(error, "Error result").to.deep.equals(errorExpected);
		});
	});

	it("02: should, when online, handle 404's'", function() {
		var userRepo = "users44";

		var roff = restoff({
			"rootUri" : ROOT_URI
		});

		var restDb = roff.dbEngine;
		dbClear(restDb);
		dbRepoShouldBeEqual(roff, restDb, userRepo, [], [], 0);

		return roff.post(userRepo, newuser01).then(function(result) {
			expect(true, "Promise should call the catch.").to.be.false;
		}).catch(function(error) {
			var errorExpected = {
				message: "Not Found",
				messageDetail: "{}",
				status: 404,
				uri: "http://test.development.com:3000/users44"
			};
			expect(error, "Error result").to.deep.equals(errorExpected);
			dbRepoShouldBeEqual(roff, restDb, userRepo, [], [], 0);
		});
	});


	it("04: should, with a non-blank repo and when online,\
		post a new resource to server and local repository\
		and 404 (Not Found) for deletes should be ignored.", function() {
		var userRepo = "users04";
		var roff = restoff({ "rootUri" : ROOT_URI });
		var dbSource = restoff({ "rootUri" : ROOT_URI });
		var restDb = roff.dbEngine;
		dbClear(restDb);
		dbRepoShouldBeEqual(roff, restDb, userRepo, [], [], 0);

		// Clean up prior run just in case
		return roff.delete(userRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68577").then(function(result) {
			return roff.get(userRepo).then(function(sourceResult) {
				dbRepoShouldBeEqual(roff, restDb, userRepo, null, sourceResult, 1);
				return roff.post(userRepo, newuser01).then(function(result) {
					dbRepoShouldBeEqual(roff, restDb, userRepo, newuser01, sourceResult, 2);
					expect(roff.repositorySizeBy(userRepo), userRepo + " repository count").to.equal(2);
					expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(result);
					return dbSource.get(userRepo).then(function(result) {
						expect(dbSource.repositorySizeBy(userRepo), userRepo + " repository count").to.equal(2);
						expect(dbSource.repositoryGet(userRepo), "Two repos should be the same").to.deep.equals(roff.repositoryGet(userRepo));
						return roff.delete(userRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68577"); // clean up
					});
				});
			});
		});
	});	

	it("05: should, when online and posting against an existing resource,\
		    overwrite the existing one", function() {
		var userRepo = "users05";

		var existingUser = {
			"id": "4a30a4fb-b71e-4ef2-b430-d46f9af3f8fa",
			"first_name": "Existing",
			"last_name": "New Name"
		};
		var existingUsers = [];
		existingUsers["4a30a4fb-b71e-4ef2-b430-d46f9af3f8fa"] = existingUser;

		var editedUser = {
			"id": "4a30a4fb-b71e-4ef2-b430-d46f9af3f8fa",
			"first_name": "Existing",
			"last_name": "Edited"
		};
		var editedUsers = [];
		editedUsers["4a30a4fb-b71e-4ef2-b430-d46f9af3f8fa"] = editedUser;

		var roff = restoff({
			"rootUri" : ROOT_URI
		});

		var restDb = roff.dbEngine;
		dbClear(restDb);
		dbRepoShouldBeEqual(roff, restDb, userRepo, [], [], 0);
		
		return roff.post(userRepo, existingUser).then(function(result) {
			roff.clearCacheAll(); // Clean up just in case
			dbRepoShouldBeEqual(roff, restDb, userRepo, [], [], 0);
			return roff.get(userRepo).then(function(result) {
				dbRepoShouldBeEqual(roff, restDb, userRepo, existingUsers, result, 1);
				return roff.post(userRepo, editedUser).then(function(result) {
					dbRepoShouldBeEqual(roff, restDb, userRepo, editedUsers, result, 1);
					return roff.post(userRepo, existingUser).then(function(result) {
						dbRepoShouldBeEqual(roff, restDb, userRepo, existingUsers, result, 1);
					});
				});
			});
		});
	});	

	// HELPER TEST FUNCTIONS

	function dbRepoShouldBeEqual(roff, database, userRepo, resource, result, size) {
		expect(roff.repositorySizeBy(userRepo), userRepo + "Repository size").to.equal(size);
		expect(dbRepoSize(database, userRepo), "database size").to.equal(size);
		expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(result);
		if (null != resource) {
			expect(roff.repositoryGet(userRepo), userRepo + " repository equals").to.deep.equals(resource);
			expect(result, userRepo + " repository equals").to.deep.equals(resource);
		}

		expect(dbResourceCompare(database, userRepo, result), userRepo + " resource should equal database").to.be.true;
	}

	function dbGet(dbName) {
		return low(dbName, { storage: low.localStorage })
	}

	function dbClear(database) {
		database.object = {};
		database.write();
	}

	function dbRepoGet(database, repoName) {
		return database(repoName).value();
	}

	function dbRepoSize(database, repoName) {
		return database(repoName).size();
	}

	function dbFind(database, repoName, pkName, pkValue) {
		database(repoName).find({ pkName: pkValue });		
	}

	function dbResourceCompare(database, repoName, resource) {
		var resourceKeys = Object.keys(resource);
		var resourceLength = resourceKeys.length;
		if (resourceLength !== dbRepoSize(database, repoName)) {
			var dbTable = dbRepoGet(database, repoName);
			console.log("Lengths not equal...");
			console.log(resourceKeys);
			console.log(dbTable);
			return false;
		}

		resourceKeys.forEach(function(key, position) {
			var objRes = resource[key];
			var ojbDb = database(repoName).find({ id: key });
			if (false === deepEqual(objRes, ojbDb)) {
				console.log(objRes);
				console.log(objDb);
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


