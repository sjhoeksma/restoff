describe ("restoff persistence using lowdb", function() {

	var ROOT_URI = "http://test.development.com:3000/";

	it("should persist a get", function() {
		var roff = restoff({
			"rootUri" : ROOT_URI,
			"dbName" : "restOffTestDb"
		});
		var userRepo = "users08";

		var restDb = roff.dbEngine;
		dbClear(restDb);

		var newuser01 = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
			"first_name": "Happy10",
			"last_name": "User10"
		};

		expect(roff.dbEngine, "Should have a lowdb database engine by default").to.be.an("function");
		expect(dbRepoGet(restDb, userRepo), "Database should be empty").to.deep.equals([]);

		return roff.get(userRepo).then(function(result) {
			expect(roff.repositorySize, "Repository size").to.equal(1);
			expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(result);
			expect(roff.repositorySizeBy(userRepo), userRepo + " object").to.equal(3);
			expect(dbResourceCompare(restDb, userRepo, result), userRepo + " resource should equal database").to.be.true;
			dbClear(restDb);
			expect(dbRepoGet(restDb, userRepo), userRepo + " object").to.deep.equals([]);
		});
	});



	// HELPER TEST FUNCTIONS

	function dbGet(dbName) {
		return low(dbName, { storage: low.localStorage })
	}

	function dbClear(database) {
		database.object = {};
		database.write();
	}

	function dbRepoGet(database, repositoryName) {
		return database(repositoryName).value();
	}

	function dbResourceCompare(database, repoName, resource) {
		var resourceKeys = Object.keys(resource);
		var resourceLength = resourceKeys.length;
		if (resourceLength !== dbRepoGet(database, repoName).length) {
			return false;
		}

		resourceKeys.forEach(function(key, position) {
			var objRes = resource[key];
			var ojbDb = database(repoName).find({ id: key });
			if (false === deepEqual(objRes, ojbDb)) {
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
