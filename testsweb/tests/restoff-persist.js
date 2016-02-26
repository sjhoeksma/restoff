describe ("restoff persistence using lowdb", function() {

	// var ROOT_URI = "http://test.development.com:3000/";

	// it("01: should persist a get", function() {
	// 	var roff = restoff({
	// 		"rootUri" : ROOT_URI,
	// 		"dbName" : "restOffTestDb"
	// 	});
	// 	var userRepo = "users08";

	// 	var restDb = roff.dbEngine;
	// 	dbClear(restDb);

	// 	var newuser01 = {
	// 		"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
	// 		"first_name": "Happy10",
	// 		"last_name": "User10"
	// 	};

	// 	expect(roff.dbEngine, "Should have a lowdb database engine by default").to.be.an("function");
	// 	expect(dbRepoGet(restDb, userRepo), "Database should be empty").to.deep.equals([]);

	// 	return roff.get(userRepo).then(function(result) {
	// 		expect(roff.repositorySize, "Repository size").to.equal(1);
	// 		expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(result);
	// 		expect(roff.repositorySizeBy(userRepo), userRepo + " object").to.equal(3);
	// 		expect(dbResourceCompare(restDb, userRepo, result), userRepo + " resource should equal database").to.be.true;
	// 		dbClear(restDb);
	// 		expect(dbRepoGet(restDb, userRepo), userRepo + " object").to.deep.equals([]);
	// 	});
	// });


	// it("02: should, with a non-blank repo and when online,\
	// 	post a new resource to server and local repository", function() {
	// 	var roff = restoff({
	// 		"rootUri" : ROOT_URI,
	// 		"dbName" : "restOffTestDb"
	// 	});
	// 	var userRepo = "users09";

	// 	var restDb = roff.dbEngine;
	// 	dbClear(restDb);

	// 	var originalUsers = {};
	// 	var originalUser = {
	// 		"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68523",
	// 		"first_name": "Existing",
	// 		"last_name": "Ready"
	// 	};
	// 	originalUsers["aedfa7a4-d748-11e5-b5d2-0a1d41d68523"] = originalUser;

	// 	var newusers = {};
	// 	var newuser = {
	// 		"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68523",
	// 		"first_name": "Existing",
	// 		"last_name": "Edited"
	// 	};
	// 	newusers["aedfa7a4-d748-11e5-b5d2-0a1d41d68523"] = newuser;

	// 	expect(restDb, "Should have a lowdb database engine by default").to.be.an("function");
	// 	expect(dbRepoGet(restDb, userRepo), "Database should be empty").to.deep.equals([]);

	// 	return roff.get(userRepo).then(function(result) {
	// 		expect(roff.repositorySize, "Repository size").to.equal(1);
	// 		expect(roff.repositorySizeBy(userRepo), userRepo + " object").to.equal(1);
	// 		expect(dbResourceCompare(restDb, userRepo, originalUsers), userRepo + " resource should equal database").to.be.true;
	// 		return roff.post(userRepo, originalUser).then(function(result) {
	// 			expect(result["aedfa7a4-d748-11e5-b5d2-0a1d41d68523"], userRepo + " object").to.deep.equal(originalUser);
	// 			expect(dbResourceCompare(restDb, userRepo, originalUsers), userRepo + " resource should equal database").to.be.true;
	// 			return roff.post(userRepo, newuser).then(function(result) {
	// 				expect(result["aedfa7a4-d748-11e5-b5d2-0a1d41d68523"], userRepo + " object").to.deep.equal(newuser);
	// 				expect(dbResourceCompare(restDb, userRepo, newusers), userRepo + " resource should equal database").to.be.true;
	// 				return roff.post(userRepo, originalUser).then(function(result) { // reset database
	// 					expect(dbResourceCompare(restDb, userRepo, originalUsers), userRepo + " resource should equal database").to.be.true;
	// 					dbClear(restDb);
	// 					expect(dbRepoGet(restDb, userRepo), userRepo + " object").to.deep.equals([]);
	// 				});
	// 			});
	// 		});
	// 	});
	// });

	// it("03: should, with a blank repo and when online,\
	// 	    post a new resource to server and local repository", function() {
	// 	var userRepo = "users02";


	// 	var newuser01 = {
	// 		"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
	// 		"first_name": "Happy3",
	// 		"last_name": "User3"
	// 	};

	// 	var newusers = {};
	// 	newusers["aedfa7a4-d748-11e5-b5d2-0a1d41d68577"] = newuser01;

	// 	var roff = restoff({
	// 		"rootUri" : ROOT_URI
	// 	});

	// 	var restDb = roff.dbEngine;
	// 	dbClear(restDb);

	// 	expect(roff.repositorySize, "Repository size").to.equal(0);

	// 	return roff.post(userRepo, newuser01).then(function(updatedResult) {
	// 		expect(roff.repositorySize, "Repository size").to.equal(1);
	// 		expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(updatedResult);
	// 		expect(dbResourceCompare(restDb, userRepo, newusers), userRepo + " resource should equal database").to.be.true;
	// 		var dbSource = restoff({
	// 			"rootUri" : ROOT_URI
	// 		});
	// 		expect(dbSource.repositorySize, "Repository size").to.equal(0);

	// 		return dbSource.get(userRepo).then(function(result) {
	// 			expect(dbSource.repositorySize, "Repository size").to.equal(1);
	// 			expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(result);
	// 			dbClear(restDb);				
	// 		});

	// 	});
	// });


	// // HELPER TEST FUNCTIONS

	// function dbGet(dbName) {
	// 	return low(dbName, { storage: low.localStorage })
	// }

	// function dbClear(database) {
	// 	database.object = {};
	// 	database.write();
	// }

	// function dbRepoGet(database, repoName) {
	// 	return database(repoName).value();
	// }

	// function dbRepoSize(database, repoName) {
	// 	return database(repoName).size();
	// }

	// function dbFind(database, repoName, pkName, pkValue) {
	// 	database(repoName).find({ pkName: pkValue });		
	// }

	// function dbResourceCompare(database, repoName, resource) {
	// 	var resourceKeys = Object.keys(resource);
	// 	var resourceLength = resourceKeys.length;
	// 	if (resourceLength !== dbRepoSize(database, repoName)) {
	// 		var dbTable = dbRepoGet(database, repoName);
	// 		console.log("Lengths not equal...");
	// 		console.log(resourceKeys);
	// 		console.log(dbTable);
	// 		return false;
	// 	}

	// 	resourceKeys.forEach(function(key, position) {
	// 		var objRes = resource[key];
	// 		var objDb = database(repoName).find({ id: key });
	// 		if (false === deepEqual(objRes, objDb)) {
	// 			console.log(objRes);
	// 			console.log(objDb);
	// 			return false;
	// 		}
	// 	});

	// 	return true;
	// }

	// function deepEqual(x, y) {
	// 	if ((typeof x == "object" && x != null) && (typeof y == "object" && y != null)) {
	// 		if (Object.keys(x).length != Object.keys(y).length) {
	// 			return false;
	// 		}

	// 		for (var prop in x) {
	// 			if (y.hasOwnProperty(prop)) {  
	// 				if (! deepEqual(x[prop], y[prop])) {
	// 					return false;
	// 				}
	// 			}
	// 			else {
	// 				return false;
	// 			}
	// 		}
	// 	return true;
	// 	} else if (x !== y) {
	// 		return false;
	// 	} else {
	// 		return true;
	// 	}
	// }

});
