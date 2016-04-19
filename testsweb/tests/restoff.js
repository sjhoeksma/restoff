/*jshint -W043 */
/* Globally shared */

var ROOT_URI = "http://test.development.com:3000/";

function deepEqualOrderUnimportant(left,right, primaryKeyName) {
	left = left instanceof Array ? left : [left]; // easier to code
	right = right instanceof Array ? right : [right];

	if (left.length != right.length) {
		console.log("Lengths not equal %O %O", left.length, right.length);
		return false;
	}

	for (var x = 0; x < left.length; x++) {
		var leftItem = left[x];
		var leftPrimayKey = leftItem[primaryKeyName];
		var hadEqualRecord = false;
		for (var y = 0; y < right.length; y++) {
			var rightItem = right[y];
			var rightPrimaryKey = rightItem[primaryKeyName];
			if (leftPrimayKey === rightPrimaryKey) {
				hadEqualRecord = deepEqual(leftItem, rightItem);
			}
		}
		if (!hadEqualRecord) {
			console.log("Nothing found for leftItem %O", leftItem);
			return false;
		}
	}
	return true;
}

function deepEqual(x, y) {
	if ((typeof x == "object" && x !== null) && (typeof y == "object" && y !== null)) {
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

function pendingResourcesGetNp(roff, repoName) {
	var pendingUri = "pending?repoName=" + repoName;
	return roff.getRepo(pendingUri, {rootUri:"http://localhost/",clientOnly:true});
}

function onlineStatusShouldEqual(roff, forced) {
	expect(roff.forcedOffline, "forcedOffline ").to.equal(forced);
}

describe ("restoff", function() {


	function testLog(text) {
		if (false) {
			console.log(text);
		}
	}

	it("01: should not wipeout Object prototype and be a restoff", function() {
		var roff = restlib.restoff();
		expect(restlib.restoff, "restoff").to.be.an("function");
		expect(roff, "restoff").to.be.an("object");
	});

	it("02: should start out as being unknown\
		    for online/offline status", function() {
		var roff = restlib.restoff();
		onlineStatusShouldEqual(roff, false);
	});

	it("03: should handle config settings correctly", function() {
		var roff = restlib.restoff();
		expect(roff.dbService, "dbService").to.be.an("object");

		expect(roff.rootUri, "rootUri").to.equal("");
		roff.rootUri = ROOT_URI;
		expect(roff.rootUri, "rootUri").to.equal(ROOT_URI);

		expect(roff.clientOnly, "clientOnly").to.equal(false);
		roff.clientOnly = true;
		expect(roff.clientOnly, "clientOnly").to.equal(true);

		expect(roff.forcedOffline, "forcedOffline").to.equal(false);
		roff.forcedOffline = true;
		expect(roff.forcedOffline, "forcedOffline").to.equal(true);

		var roff2 = restlib.restoff({
			rootUri : ROOT_URI,
			dbService : {
				primaryKeyName : "id2",
				dbName : "TestDb"
			},
			clientOnly : true,
			forcedOffline : true,
			pendingUri : "http://notlocalhost/pending/",
			pendingRepoName : "pending2"
		});

		expect(roff2.dbService.dbName, "dbService.dbName").to.equal("TestDb");
		expect(roff2.rootUri, "rootUri").to.equal(ROOT_URI);
		expect(roff2.clientOnly, "clientOnly").to.equal(true);
		expect(roff2.forcedOffline, "forcedOffline").to.equal(true);
	});

	it("04: get should, when online, get multiple resources\
		    and store them on the client,\
		    clear a single repository\
			support a rootUri configuration,\
		    have correct online statuses\
		    and still be available when offline", function() {
		var userRepo = "users11";
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
		onlineStatusShouldEqual(roff, false);
		return roff.get(userRepo).then(function(result) {
			onlineStatusShouldEqual(roff, false);
			dbRepoShouldBeEqual(roff, userRepo, result, 3);
			return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) {
				expect(result, "db repo the same").to.equal(true);
				roff.forcedOffline = true;
				onlineStatusShouldEqual(roff, true);
				return roff.get(userRepo).then(function(result){
					dbRepoShouldBeEqual(roff, userRepo, result, 3);
					onlineStatusShouldEqual(roff, true);
				});
			});
		});
	});

	it("05: get should, when online, get a single resources,\
			clear multiple repositories\
		    and store it on the client.\
		    should use full uri if passed", function() {
		var userRepo = "users12";
		var userRepo2 = "users11";
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		roff.clear(userRepo, true);
		roff.clear(userRepo2, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
		return roff.get(ROOT_URI + userRepo).then(function(result) {
			dbRepoShouldBeEqual(roff, userRepo, result, 1);
			return roff.get(userRepo2).then(function(result2){
				dbRepoShouldBeEqual(roff, userRepo2, result2, 3);
				dbRepoShouldBeEqual(roff, userRepo, result, 1);
				return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) {
					expect(result, "db repo the same").to.equal(true);
					roff.clearAll(true);
					dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
				});
			});
		});
	});

	it("06: get should, when online, handle network errors", function() {
		var roff = restlib.restoff({
			rootUri: "http://idontexisthopefully.com/"
		});
		return roff.get("http://idontexisthopefully.com/endpoint").then(function(result) {
			expect(true, "Promise should call the catch.").to.equal(false);
		}).catch(function(error) {
			var errorExpected = {
				message: "Network Error",
				messageDetail: "",
				status: 0,
				uri: "http://idontexisthopefully.com/endpoint",
				restMethod: "GET"
			};
			expect(error, "Error result").to.deep.equals(errorExpected);
			onlineStatusShouldEqual(roff, false);
		});
	});

	it("07: get should, when online, handle 404\
		    and when offline create a repository", function() {
		var userRepo = "users100";

		var roff = restlib.restoff({
			"rootUri" : ROOT_URI
		});
		roff.clear(userRepo, true);
		return roff.get(userRepo).then(function(result) {
			expect(true, "Promise should call the catch.").to.equal(false);
		}).catch(function(error) {
			var errorExpected = {
				message: "Not Found",
				messageDetail: "{}",
				status: 404,
				uri: "http://test.development.com:3000/"+userRepo,
				restMethod: "GET"
			};
			expect(error, "Error result").to.deep.equals(errorExpected);
			onlineStatusShouldEqual(roff, false);
			roff.forcedOffline = true;
			return roff.get(userRepo).then(function(result) {
				expect(roff.dbService.dbRepo.length(userRepo), "repository should exist").to.equal(0);
			});
		});
	});

	it("08: get should support enabling and disabling of the\
			persistence engine. No information should be\
			persisted on a get. When offline, nothing should\
			be retrieved.", function() {
		// TODO: Add Post, Delete, Put
		var roffParam = restlib.restoff();

		expect(roffParam.persistenceDisabled, "persistenceDisabled").to.equal(false);
		expect(roffParam.dbService, "dbService").to.be.an("object");
		roffParam.persistenceDisabled = true;
		expect(roffParam.persistenceDisabled, "persistenceDisabled").to.equal(true);
		expect(roffParam.dbService, "dbService").to.be.an("object");
		roffParam.persistenceDisabled = false;
		expect(roffParam.dbService, "dbService").to.be.an("object");

		var roffParam2 = restlib.restoff({
			"persistenceDisabled" : true
		});

		expect(roffParam2.persistenceDisabled, "persistenceDisabled").to.equal(true);

		var userRepo = "users11";
		var roff = restlib.restoff({
			"rootUri" : ROOT_URI,
			"persistenceDisabled" : false // to run clear and read db results
		});
		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
		roff.persistenceDisabled = true;
		return roff.get(userRepo).then(function(result) {
			roff.persistenceDisabled = false; // to read db results
			dbRepoShouldBeEmptyAndResourceNotEmpty(roff, userRepo, result);
			roff.persistenceDisabled = true;
			roff.forcedOffline = true;
			return roff.get(userRepo).then(function(result2) {
				roff.persistenceDisabled = false; // to read db results
				dbRepoShouldBeEqual(roff, userRepo, result2, 0); // when offline repo is also empty
			});
		});
	});

	it("09: should support a non-standard RESTful api,\
			non-standard primaryKeyName,\
			and a single non-array resource: not [{ object }] but {object } ", function() {
		var roff = restlib.restoff({
			rootUri: "http://test.development.com:4050/testsweb/testdata/",
			dbService: {
				primaryKeyName: "guid"
			}
		});
		return roff.get("http://test.development.com:4050/testsweb/testdata/addresses").then(function(addresses) {
			dbRepoShouldBeEqual(roff, "addresses", addresses, 1, "guid");
		});
	});

	it("10: should support more than one repository", function() {
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
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
		var roff = restlib.restoff({
			"rootUri" : ROOT_URI
		}).autoQueryParamSet("access_token", "rj5aabcea");

		expect(roff, "roff").to.be.an('object');
		expect(roff.autoQueryParamGet("access_token"), "access_token").to.equal("rj5aabcea");

		roff.autoQueryParamSet("access_token", "rj5aabcea2");
		expect(roff.autoQueryParamGet("access_token"), "access_token").to.equal("rj5aabcea2");
		roff.autoQueryParamSet("another_auto", "another_value");
		var generated = roff.uriFromClient("users", "GET");
		expect(generated.uriFinal, "Generated uri").to.equal(ROOT_URI + "users?access_token=rj5aabcea2&another_auto=another_value");

		var generated2 = roff.uriFromClient("users?already=added");
		expect(generated2.uriFinal, "Generated uri").to.equal(ROOT_URI + "users?already=added&access_token=rj5aabcea2&another_auto=another_value");

		var userRepo = "users11";
		return roff.get(userRepo).then(function(users) {
			dbRepoShouldBeEqual(roff, userRepo, users, 3);
		});
	});

	it("12: should support adding headers automatically", function() {
		var roff = restlib.restoff({
			"rootUri" : ROOT_URI
		}).autoHeaderParamSet("access_token", "rj5aabcea");

		expect(roff, "roff").to.be.an('object');
		expect(roff.autoHeaderParamGet("access_token"), "access_token").to.equal("rj5aabcea");

		var userRepo = "users11";

		return roff.get(userRepo).then(function(users){
			dbRepoShouldBeEqual(roff, userRepo, users, 3);
		});
	});

	it("13: should, when offline and have records,\
			return a subset of data from the persisted\
			data store. Calling get again with a subset of\
			data, when no changes have occured on the server,\
			result in that get being overwritting the existing\
			repository when soft-delete and last_updated not available.", function () {

		var userReturned =  {
			"ID": "4a30a4fb-b71e-4ef2-b430-d46f9af3f8fa",
			"first_name": "Existing",
			"last_name": "New Name",
			"id": "4a30a4fb-b71e-4ef2-b430-d46f9af3f8fa"
		};

		var usersReturned = [userReturned];

		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		var userRepo = "users11";

		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
		return roff.get(userRepo).then(function(users) {
			dbRepoShouldBeEqual(roff, userRepo, users, 3);
			return roff.get(userRepo + "/" + "4a30a4fb-b71e-4ef2-b430-d46f9af3f8fa", {primaryKeyName: "ID"}).then(function (userOnline) {
				dbRepoShouldBeEqual(roff, userRepo, userOnline, 1); // changes to existing repository
				roff.forcedOffline = true;
				return roff.get(userRepo + "/" + "4a30a4fb-b71e-4ef2-b430-d46f9af3f8fa").then(function (userWhileOffline) {
					dbRepoShouldBeEqual(roff, userRepo, userWhileOffline, 1); // no changes to existing repository
					expect(deepEqual(usersReturned, userWhileOffline), " users returned should be the same").to.equal(true);
				});
			});
		});
	});

	it("14: get, when clientOnly is true, should persist the data locally\
			and there should be no pending changes for update/put/delete", function() {

		var roff = restlib.restoff({
			"rootUri" : ROOT_URI,
			"clientOnly" : true,
			"pendingRepoName": "pending2"
		});
		var userRepo = "users11";
		var pendingRepo = "clientOnly";

		var pendingRec = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd13",
			"restMethod" : "PUT",
			"uri" : "http://www.whatever.com"
		};

		var pendingRecs = [pendingRec];

		roff.clear(userRepo, true);
		roff.clear(pendingRepo, true);
		return roff.get(userRepo).then(function(result) { // useres11 has 3 records but since we are clientOnly, our repo should still be empty.
			return roff.delete(pendingRepo + "/" + pendingRec.id).then(function() { // 'restart' testing
				expect(roff.dbService.dbRepo.length(pendingRepo), "repository should be empty when clientOnly is true").to.equal(0);
				pendingStatusCount(roff,0,"delete"); // should have no pending
					return roff.post(pendingRepo, pendingRec).then(function(result) {
					expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have one record").to.equal(1);
					pendingStatusCount(roff,0,"post"); // should have no pending
					return roff.put(pendingRepo + "/" + pendingRec.id, pendingRec).then(function(result) {
						expect(pendingRecs.length, "repository should have one record").to.equal(1);
						expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have one record").to.equal(1);
						pendingStatusCount(roff,0,"put"); // should have no pending
					});
				});
			});
		});
	});

	it("15: get, when clientOnly properties are true, should persist the data locally\
			and there should be no pending changes for update/put/delete", function() {

		var roff = restlib.restoff({
			"rootUri" : ROOT_URI,
			"pendingRepoName": "pending2"
		});
		var userRepo = "users11";
		var pendingRepo = "offlineOnly";

		var pendingRec = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd13",
			"restMethod" : "PUT",
			"uri" : "http://www.whatever.com"
		};
		return roff.delete(pendingRepo + "/" + pendingRec.id).then(function(idDeleted) { // reset test for delete
			expect(idDeleted, "should return id deleted").to.equal(pendingRec.id);
			expect(roff.dbService.dbRepo.length(pendingRepo), "should have no records").to.equal(0);
			return roff.get(userRepo, {clientOnly:true}).then(function(result) { // useres11 is still a client
				expect(roff.dbService.dbRepo.length(userRepo), "repository should be empty when clientOnly is true").to.equal(0); // client only
				return roff.post(pendingRepo, pendingRec, {clientOnly:true}).then(function(result) {
					expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have one record").to.equal(1);
					pendingStatusCount(roff,0,"post"); // should have no pending
					return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
						expect(result, "clientOnly was true so should not be equal").to.equal(false);
						return roff.put(pendingRepo + "/" + pendingRec.id, pendingRec, {clientOnly:true}).then(function(result) {
							expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have one record").to.equal(1);
							pendingStatusCount(roff,0,"put"); // should have no pending
							return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
								expect(result, "clientOnly was true so should not be equal").to.equal(false);
								return roff.post(pendingRepo, pendingRec).then(function(result) {
									expect(roff.dbService.dbRepo.length(pendingRepo), "should have just one record").to.equal(1);
									return dbRepoExactlyEqual(roff, pendingRepo, true).then(function(result) {
										expect(result, "Initial db/repo to be equal").to.equal(true);
										return roff.delete(pendingRepo + "/" + pendingRec.id, {clientOnly:true}).then(function(idDeleted) { // for delete, while clientOnly, shoud not delete
											expect(idDeleted, "should return id deleted").to.equal(pendingRec.id);
											expect(roff.dbService.dbRepo.length(pendingRepo), "repository should be empty when clientOnly is true").to.equal(0);
											pendingStatusCount(roff,0,"delete"); // should have no pending
											return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
												expect(result, "db/repo should not be equal when clientOnly").to.equal(false);
												return roff.delete(pendingRepo + "/" + pendingRec.id).then(function() { // clean up test
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});

	it("16: get, when forcedOffline properties are true, should persist the data locally\
			and there SHOULD BE pending changes for update/put/delete", function() {

		var roff = restlib.restoff({
			"rootUri" : ROOT_URI
		});
		var userRepo = "users11";
		var pendingRepo = "forcedOffline";

		var pendingRec = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd13",
			"restMethod" : "PUT",
			"uri" : "http://www.whatever.com"
		};
		roff.clear(userRepo, true);
		roff.clear(pendingRepo, true);
		return roff.delete(pendingRepo + "/" + pendingRec.id).then(function() { // reset test for delete
			expect(roff.dbService.dbRepo.length(pendingRepo), "should have just one record").to.equal(0);
			return roff.get(userRepo, {forcedOffline:true}).then(function(result) { // useres11 is still a client
				expect(roff.dbService.dbRepo.length(userRepo), "repository should be empty when forcedOffline is true").to.equal(0); // forcedOffline
				return roff.post(pendingRepo, pendingRec, {forcedOffline:true}).then(function(result) {
					expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have one record").to.equal(1);
					pendingStatusCount(roff, 1, "post"); // should have one pending
					return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
						expect(result, "forcedOffline was true so should not be equal").to.equal(false);
						return roff.put(pendingRepo + "/" + pendingRec.id, pendingRec, {forcedOffline:true}).then(function(result) {
							expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have one record").to.equal(1);
							pendingStatusCount(roff, 2, "put"); // should have two pending
							return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
								expect(result, "forcedOffline was true so should not be equal").to.equal(false);
								return roff.post(pendingRepo, pendingRec).then(function(result) {
									expect(roff.dbService.dbRepo.length(pendingRepo), "should have just one record").to.equal(1);
									return dbRepoExactlyEqual(roff, pendingRepo, true).then(function(result) {
										expect(result, "Initial db/repo to be equal").to.equal(true);
										return roff.delete(pendingRepo + "/" + pendingRec.id, {forcedOffline:true}).then(function() { // for delete, while forcedOffline, should not delete
											expect(roff.dbService.dbRepo.length(pendingRepo), "repository should be empty when forcedOffline is true").to.equal(0);
											pendingStatusCount(roff, 3, "delete"); // should have three pending
											return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
												expect(result, "db/repo should not be equal when forcedOffline").to.equal(false);
												return roff.delete(pendingRepo + "/" + pendingRec.id).then(function() { // clean up test
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});

	it("17: get, when persistenceDisabled properties are true, should not persist the data locally\
			and there SHOULD BE no pending changes for update/put/delete.\
			persistenceDisabled is ignored for get", function() {

		var roff = restlib.restoff({
			"rootUri" : ROOT_URI
		});
		var userRepo = "users11";
		var pendingRepo = "persistenceDisabled";

		var pendingRec = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd13",
			"restMethod" : "PUT",
			"uri" : "http://www.whatever.com"
		};
		roff.clearAll(true); // TODO: Figure out which test is not clearing out pending and fix it so we can remove this line.
		roff.clear(userRepo, true);
		roff.clear(pendingRepo, true);
		return roff.delete(pendingRepo + "/" + pendingRec.id).then(function() { // reset test for delete
			expect(roff.dbService.dbRepo.length(pendingRepo), "should have just one record").to.equal(0);
			return roff.get(userRepo, {forcedOffline: false, persistenceDisabled:false}).then(function(result) { // useres11 is still a client
				expect(roff.dbService.dbRepo.length(userRepo), "repository should be empty when persistenceDisabled is true").to.equal(3);
				return roff.get(userRepo, {forcedOffline: true, persistenceDisabled:true}).then(function(result) { // useres11 is still a client
					expect(result.length, "repository should be empty when persistenceDisabled is true").to.equal(0);
					return roff.post(pendingRepo, pendingRec, {forcedOffline: true, persistenceDisabled:true}).then(function(result) {
						expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have no records").to.equal(0);
						pendingStatusCount(roff, 0, "post"); // should have no pending
						return roff.post(pendingRepo, pendingRec, {persistenceDisabled:true}).then(function(result) {
							expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have no records").to.equal(0);
							pendingStatusCount(roff, 0, "post 2nd"); // should have no pending

							return roff.put(pendingRepo + "/" + pendingRec.id, pendingRec, {persistenceDisabled:true}).then(function(result) {
								expect(roff.dbService.dbRepo.length(pendingRepo), "repository should not have one record").to.equal(0);
								pendingStatusCount(roff, 0, "put"); // should have no pending
								return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
									expect(result, "persistenceDisabled was true so should not be equal").to.equal(false);
									return roff.post(pendingRepo, pendingRec).then(function(result) { // get a post in the repo so we can test that delete doesn't remove it
										expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have one record").to.equal(1);
										return roff.delete(pendingRepo + "/" + pendingRec.id, {persistenceDisabled:true}).then(function() { // for delete, while persistenceDisabled, should delete
											expect(roff.dbService.dbRepo.length(pendingRepo), "repository should be empty when persistenceDisabled is true").to.equal(1); // should not delete from repo
											pendingStatusCount(roff, 0, "delete"); // should have no pending
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});

	it("18: should support a rootUri uri specific option\
		and the rootUri should be terminated with a backslash\
		if one was not provided in the rootUri\
		and pending should be configurable", function() {
		var roff = restlib.restoff({
			"rootUri" : ROOT_URI,
			"clientOnly" : true
		});

		var pendingRec = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd13",
			"restMethod" : "PUT",
			"uri" : "http://localhost"
		};
		return roff.delete(roff.pendingUri + "pending/9783df16-0d70-4362-a1ee-3cb39818fd13", {rootUri: "http://localhost"}).then(function(result) { // reset test
			pendingStatusCount(roff, 0, "delete");
			roff.rootUri = "http://localhost";
			return roff.post("pending", pendingRec).then(function(result) {
				expect(roff.dbService.dbRepo.read("pending"), "pending should be stored").to.be.an("array");
			});
		});
	});

	it("19: get should, when provided with parameters,\
			delete everything that matches a query", function(){

		// NOTE: Current test backed doesn't support stuff like users11?first_name=Fantastic.
		//		 So, this test does it all on the client side.
		var roff = restlib.restoff({
			"rootUri" : "http://localhost/",
			"clientOnly" : true
		});

		var pendingRec = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd13",
			"restMethod" : "PUT",
			"uri" : "http://localhost/pending/"
		};

		var pendingRec2 = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd15",
			"restMethod" : "PUT",
			"uri" : "http://localhost/pending/"
		};

		var pendingRec3 = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd14",
			"restMethod" : "GET",
			"uri" : "http://localhost/pending/"
		};

		return roff.post("pending3", pendingRec).then(function(result) {
			return roff.post("pending3", pendingRec2).then(function(result2) {
				return roff.post("pending3", pendingRec3).then(function(result3) {
					expect(roff.dbService.dbRepo.read("pending3").length).to.equal(3);
 					return roff.get("pending3?restMethod=PUT").then(function(result) {
						expect(result.length, "for pending3?restMethod=PUT only two items should have returned").to.equal(2);
					});
				});
			});
		});
	});

	it("20: get should, support a repoName option", function(){

		// NOTE: Current test backed doesn't support stuff like users11?first_name=Fantastic.
		//		 So, this test does it all on the client side.
		var roff = restlib.restoff({
			"rootUri" : "http://localhost/",
			"clientOnly" : true
		});

		var uri = roff.uriFromClient("user", "GET", undefined, undefined);
		expect (uri.repoName, "should get reponame from uri").to.equal("user");

		var uri2 = roff.uriFromClient("user", "GET", undefined, {repoName: "notUser"});
		expect (uri2.repoName, "should get repoName from options").to.equal("notUser");

	});


	it("20: auto param set should overwrite an existing paramter", function(){

		// NOTE: Current test backed doesn't support stuff like users11?first_name=Fantastic.
		//		 So, this test does it all on the client side.
		var roff = restlib.restoff({
			"rootUri" : "http://localhost/"
		});

		roff.autoQueryParamSet("auto_one", "hello");
		var uri = roff.uriFromClient("user", "GET", undefined, undefined);
		expect(uri.uriFinal, "valid uriFinal").to.equal("http://localhost/user?auto_one=hello");
		roff.autoQueryParamSet("auto_one", "goodbye");
		var uri2 = roff.uriFromClient("user", "GET", undefined, undefined);
		expect(uri2.uriFinal, "valid uriFinal " + uri2.uriFinal).to.equal("http://localhost/user?auto_one=goodbye");
	});


	it("21: should provide a useful error message for missing primary keys", function(){

		// NOTE: Current test backed doesn't support stuff like users11?first_name=Fantastic.
		//		 So, this test does it all on the client side.
		var roff = restlib.restoff({
			rootUri: ROOT_URI,
			dbService: {
				primaryKeyName : "ID",
			},
		});
		var userRepo = "users01";

		return roff.get(userRepo).catch(function(error) {
			var error2 = "Expected resource in repository 'users01' to have a primary key named 'ID'. The resource we are checking against is {\"id\":\"aedfa7a4-d748-11e5-b5d2-0a1d41d68577\",\"first_name\":\"Happy2\",\"last_name\":\"User2\"}. The primary key name comes from the global configuration or you can set it for each RESTful call. Please see supporting documentation.";
			expect(error.message, "correct error").to.equal(error2);
		});

	});


	// dbActions Differ From RESTful Action

	// Get - Postins
	// Get - Put
	// Get - Delete
	// Get - Get

	// Postins - Postins
	// Postins - Put
	// Postins - Delete
	// Postins - Get

	// Put - Postins
	// Put - Put
	// Put - Delete
	// Put - Get

	// Delete - Postins
	// Delete - Put
	// Delete - Delete
	// Delete - Get


	// POST ------------------------------------------------------

	// TODO: Handle logic to warn a user when they call POST without a resource

	var newuser01 = {
		"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
		"first_name": "Happy3",
		"last_name": "User3"
	};

	var newusers = {};
	newusers["aedfa7a4-d748-11e5-b5d2-0a1d41d68577"] = newuser01;

	it("30: post should, with a blank repo and when online,\
		    post a new resource to server and local repository", function() {
		var userRepo = "users02";
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		var dbSource = restlib.restoff({ "rootUri" : ROOT_URI });

		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

		return roff.post(userRepo, newuser01).then(function(updatedResult) {
			dbRepoShouldBeEqual(roff, userRepo, updatedResult, 1);
			return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) { // verify posted to server
				expect(result, "db repo the same").to.equal(true);
			});
		});
	});

	it("31: post should, when online and posting against an existing resource,\
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

		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

		return roff.post(userRepo, existingUser).then(function(result) { // reset test just in case
			onlineStatusShouldEqual(roff, false);
			dbRepoShouldBeEqual(roff, userRepo, result, 1);
			roff.clear(userRepo, true);
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			return roff.get(userRepo).then(function(result) {
				dbRepoShouldBeEqual(roff, userRepo, result, 1);
				return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) { // verify posted to server
					expect(result, "db repo the same").to.equal(true);
					return roff.post(userRepo, editedUser).then(function(result) {
						dbRepoShouldBeEqual(roff, userRepo, result, 1);
						return roff.post(userRepo, existingUser).then(function(result) { // rest test again
							dbRepoShouldBeEqual(roff, userRepo, result, 1);
							return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) { // verify posted to server
								expect(result, "db repo the same").to.equal(true);
							});
						});
					});
				});
			});
		});
	});

	it("32: post should, when online, handle network errors", function() {
		var roff = restlib.restoff({
			rootUri: "http://idontexisthopefully.com/"
		});
		return roff.post("http://idontexisthopefully.com/resource", newuser01).then(function(result) {
			expect(true, "Promise should call the catch.").to.equal(false);
		}).catch(function(error) {
			var errorExpected = {
				message: "Network Error",
				messageDetail: "",
				status: 0,
				uri: "http://idontexisthopefully.com/resource",
				restMethod: "POST"
			};
			expect(error, "Error result").to.deep.equals(errorExpected);
			onlineStatusShouldEqual(roff, false);
		});
	});

	it("33: post should, when online, handle 404s\
		and NOT persist the resource in the database", function() {
		var userRepo = "users44";
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		roff.clearAll(true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

		return roff.post(userRepo, newuser01).then(function(result) {
			expect(true, "Promise should call the catch.").to.equal(false);
		}).catch(function(error) {
			var errorExpected = {
				message: "Not Found",
				messageDetail: "{}",
				status: 404,
				uri: "http://test.development.com:3000/users44",
				restMethod: "POST"
			};
			expect(error, "Error result").to.deep.equals(errorExpected);
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			onlineStatusShouldEqual(roff, false);
		});
	});

	it("34: post should, when offline,\
		post a new resource on the client and,\
		add the request to pending,\
		and clearAll should fail when force is false\
		and clear repo should fail when force is false\
		and pending should always have 'id' as the primaryKeyName", function() {

		var newuser01 = {
			"ID": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
			"first_name": "Happy3",
			"last_name": "User3"
		};


		var userRepo = "users200";
		var roff = restlib.restoff({
			"rootUri" : ROOT_URI,
			forcedOffline : true,
			dbService : {
				primaryKeyName : "ID"
			}
		});
		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

		return roff.post(userRepo, newuser01).then(function(result) {
			onlineStatusShouldEqual(roff, true);
			dbRepoShouldBeEqual(roff, userRepo, result, 1);
			pendingStatusCorrect(roff, result, "POST", 0, ROOT_URI + userRepo, userRepo);
			expect(function() {
					roff.clearAll(false);
			},"should throw exception").to.throw("Submit pending changes before clearing database or call clearAll(true) to force.");
			expect(function() {
					roff.clear(userRepo);
			},"should throw exception").to.throw("Submit pending changes before clearing database or call clear(repoName, true) to force.");
			dbRepoShouldBeEqual(roff, userRepo, result, 1);
			roff.clearAll(true);
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			pendingStatusCount(roff,0,"clear all");
			return roff.post(userRepo, newuser01).then(function(result) {
				dbRepoShouldBeEqual(roff, userRepo, result, 1);
				return roff.post("user201", newuser01).then(function(result) { // get another pending so we can test clearing of just one repo
					pendingStatusCount(roff, 2, "post");
					dbRepoShouldBeEqual(roff, "user201", result, 1);
					roff.clear("user201", true);
					pendingStatusCount(roff, 1, "clear"); // should clear only one pending
				});
			});
		});
	});

	// PUT ------------------------------------------------------
	// TODO: Handle logic to warn a user when they call POST without a resource

	it("50: put should, when online,\
		    should NOT put a new resource to server and local repository\
		    and handle a 404 (resource not found)", function() {

		var expectedUser = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68510",
			"first_name": "Happy3",
			"last_name": "User3"
		};

		var expectedUsers = {};
		expectedUsers["aedfa7a4-d748-11e5-b5d2-0a1d41d68510"] = expectedUser;

		var userRepo = "users11";
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

		return roff.put(userRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68510", expectedUser).then(function(result) {
			expect(true, "Promise should call the catch.").to.equal(false);
		}).catch(function(error) {
			var errorExpected = {
				message: "Not Found",
				messageDetail: "{}",
				status: 404,
				uri: "http://test.development.com:3000/users11/aedfa7a4-d748-11e5-b5d2-0a1d41d68510",
				restMethod: "PUT"
			};
			expect(error, "Error result").to.deep.equals(errorExpected);
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			onlineStatusShouldEqual(roff, false);
		});
	});

	it("51: put should, when online, handle network errors", function() {
		var roff = restlib.restoff({
			rootUri: "http://idontexisthopefully.com/"
		});
		return roff.put("http://idontexisthopefully.com/users/aedfa7a4-d748-11e5-b5d2-0a1d41d68510", newuser01).then(function(result) {
			expect(true, "Promise should call the catch.").to.equal(false);
		}).catch(function(error) {
			var errorExpected = {
				message: "Network Error",
				messageDetail: "",
				status: 0,
				uri: "http://idontexisthopefully.com/users/aedfa7a4-d748-11e5-b5d2-0a1d41d68510",
				restMethod: "PUT"
			};
			expect(error, "Error result").to.deep.equals(errorExpected);
			onlineStatusShouldEqual(roff, false);
		});
	});

	it("52: put should, when online and with a blank repo,\
		    put an existing resource on the server and local repository", function() {
		var userRepo = "users07";
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

		var puttedUser = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
			"first_name": "Happy3",
			"last_name": "putted"
		};

		var existingUser01 = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
			"first_name": "Happy3",
			"last_name": "User3"
		};
		onlineStatusShouldEqual(roff, false);

		// Assure test data is in the database
		return roff.put(userRepo + "/" + existingUser01.id, existingUser01).then(function(result) {
			onlineStatusShouldEqual(roff, false);
			dbRepoShouldBeEqual(roff, userRepo, result, 1);
			return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) { // verify posted to server
				expect(result, "db repo the same").to.equal(true);
				return roff.put(userRepo + "/" + puttedUser.id, puttedUser).then(function(result) {
					dbRepoShouldBeEqual(roff, userRepo, result, 1);
					return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) { // verify posted to server
						expect(result, "db repo the same").to.equal(true);
						existingUser01.last_name = "User3"; // TODO: Figure out why last_name of existingUser01 gets set to "putted".
						return roff.put(userRepo + "/" + existingUser01.id, existingUser01).then(function(result) {
							dbRepoShouldBeEqual(roff, userRepo, result, 1);
						}); // Reset test with original data
					});
				});
			});
		});
	});


	it("53: put should, when offline,\
		put the resource when it is in the client database\
		but NOT put a NEW sesource on the client and throw a 404 error.\
		and add the request to pending", function() {

		var newUser = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68508",
			"first_name": "New",
			"last_name": "User"
		};

		var puttedUser = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
			"first_name": "Happy3",
			"last_name": "putted"
		};

		var userRepo = "users08";
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
		return roff.get(userRepo).then(function(getResults) {
			dbRepoShouldBeEqual(roff, userRepo, getResults, 3);
			roff.forcedOffline = true;
			onlineStatusShouldEqual(roff, true);

			return roff.put(userRepo+"/"+newUser.id, newUser).catch(function(error) {
				var errorExpected = {
					message: "Not Found",
					messageDetail: "",
					status: 404,
					uri: "http://test.development.com:3000/" + userRepo + "/"+newUser.id
				};

				expect(error, "Error result").to.deep.equals(errorExpected);
				onlineStatusShouldEqual(roff, true);
				return roff.put(userRepo+"/"+puttedUser.id, puttedUser).then(function(result) {
					var repoResource = roff.dbService.dbRepo.find(userRepo, "id", puttedUser.id);
					expect(deepEqual(repoResource, result), "put on client").to.equal(true);
					pendingStatusCorrect(roff, result, "PUT", 0, ROOT_URI + userRepo + "/" + puttedUser.id, userRepo);

				});
			});
		});
	});

	it("60: delete should, when online, handle a 404\
			(resource not found) by 'ignoring' them. \
			Should also ignore when persistenceDisabled is true", function() {
		var userRepo = "users44";

		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

		return roff.delete(userRepo).then(function(result) {
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			onlineStatusShouldEqual(roff, false);
			roff.persistenceDisabled = true;
			return roff.delete(userRepo).then(function(result) {
				roff.persistenceDisabled = false;
				dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
				onlineStatusShouldEqual(roff, false);
			});
		}).catch(function(error) {
			console.log(error);
			expect(true, "Promise should call the then.").to.equal(false);
		});
	});

	it("61: delete should, when online, delete an existing\
		     resource on the client and server", function() {

		var userToDelete = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68522",
			"first_name": "Unhappy",
			"last_name": "User"
		};
		var usersToDelete = [];
		usersToDelete["aedfa7a4-d748-11e5-b5d2-0a1d41d68522"] = userToDelete;

		var userRepo = "users06";
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

		return roff.post(userRepo, userToDelete).then(function(result) {
			dbRepoShouldBeEqual(roff, userRepo, result, 1);
			return roff.delete(userRepo + "/" + userToDelete.id).then(function(result) {
				onlineStatusShouldEqual(roff, false);
				dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			}).catch(function(error) {
				console.log(error);
				expect(true, "Promise should call the then.").to.equal(false);
			});

		});
	});

	it("62: delete should, with a blank repo and when online,\
	        do nothing because we can't delete something\
	        we don't have the key of", function() {
	});

	it("63: delete should, when online, handle network errors", function() {
		var userRepo = "users";
		var roff = restlib.restoff({
			"rootUri" : "http://idontexisthopefully.com/"
		});
		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
		return roff.delete("http://idontexisthopefully.com/users/001").then(function(idDeleted) {
			expect(true, "Promise should call the catch.", false);
		}).catch(function(error) {
			var errorExpected = {
				message: "Network Error",
				messageDetail: "",
				status: 0,
				uri: "http://idontexisthopefully.com/users/001",
				restMethod: "DELETE"
			};
			expect(error, "Error result").to.deep.equals(errorExpected);
			onlineStatusShouldEqual(roff, false);
		});
	});

	it("64: delete should, when offline,\
		delete the resource when it is in the client database\
		and add the request to pending", function() {

		var userToDelete = {
			"id": "aedfa5a4-d748-11e5-b5d2-0a1d41d68508",
			"first_name": "Go",
			"last_name": "Away"
		};

		var userRepo = "users14";
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
		return roff.post(userRepo, userToDelete).then(function(getResults) {
			dbRepoShouldBeEqual(roff, userRepo, getResults, 1);
			roff.forcedOffline = true;
			onlineStatusShouldEqual(roff, true);
			return roff.delete(userRepo + "/" + userToDelete.id).then(function(getResults) {
				onlineStatusShouldEqual(roff, true);
				dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
				pendingStatusCorrect(roff, undefined, "DELETE", 0, ROOT_URI + userRepo + "/" + userToDelete.id, userRepo);
			});
		});
	});

	it("65: delete should, when offline and persistenceDisabled,\
		not delete the resource when it is in the client database\
		and not add the request to pending", function() {

		var userToDelete = {
			"id": "aedfa5a4-d748-11e5-b5d2-0a1d41d68508",
			"first_name": "Go",
			"last_name": "Away"
		};

		var userRepo = "user14";
		var roff = restlib.restoff({
			"rootUri" : ROOT_URI,
			forcedOffline: true
		});
		roff.clearAll(true); // TODO:: Figure out which test isn't cleanring pending and fix it so we can remove the clearAll
		pendingStatusCount(roff,0,"clear"); // should have no pending
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
		roff.persistenceDisabled = true;
		return roff.delete(userRepo + "/" + userToDelete.id).then(function(getResults) {
			roff.persistenceDisabled = false;
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			pendingStatusCount(roff,0,"delete"); // should have no pending
		});
	});

	it("66: delete should, when no primary key is provided,\
			delete everything in the repository", function(){

		var roff = restlib.restoff({
			"rootUri" : "http://localhost/",
			"clientOnly" : true
		});

		var pendingRec = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd13",
			"restMethod" : "PUT",
			"uri" : "http://localhost/pending/"
		};

		var pendingRec2 = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd15",
			"restMethod" : "PUT",
			"uri" : "http://localhost/pending/"
		};


		return roff.post("pending2", pendingRec).then(function(result) {
			return roff.post("pending2", pendingRec2).then(function(result2) {
				expect(roff.dbService.dbRepo.read("pending2").length).to.equal(2);
				return roff.delete("pending2").then(function(result2) {
					expect(roff.dbService.dbRepo.read("pending2").length).to.equal(0);
				});
			});
		});
	});


	it("67: delete should, when provided with parameters,\
			delete everything that matches a query", function(){

		var roff = restlib.restoff({
			"rootUri" : "http://localhost/",
			"clientOnly" : true
		});

		var pendingRec = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd13",
			"restMethod" : "PUT",
			"uri" : "http://localhost/pending/"
		};

		var pendingRec2 = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd15",
			"restMethod" : "PUT",
			"uri" : "http://localhost/pending/"
		};

		var pendingRec3 = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd14",
			"restMethod" : "GET",
			"uri" : "http://localhost/pending/"
		};

		return roff.post("pending3", pendingRec).then(function(result) {
			return roff.post("pending3", pendingRec2).then(function(result2) {
				return roff.post("pending3", pendingRec3).then(function(result3) {
					expect(roff.dbService.dbRepo.read("pending3").length).to.equal(3);
					return roff.delete("pending3?restMethod=PUT").then(function(result4) {
						expect(roff.dbService.dbRepo.read("pending3").length).to.equal(1);
					});
				});
			});
		});
	});

	// it("68: get should, when there are a lot of items to get\
	// 		and pending is there, be fastish.", function() {
	//
	// 	var roff = restlib.restoff({
	// 		rootUri : ROOT_URI
	// 	});
	//
	// 	var userToPost = {
	// 		"id": "aedfa5a4-d748-11e5-b5d2-0a1d41d68522",
	// 		"first_name": "Go",
	// 		"last_name": "Away"
	// 	};
	//
	//
	// 	var userRepo = "users16";
	// 	roff.clear(userRepo, true);
	// 	return roff.get(userRepo).then(function(result) {
	// 		roff.forcedOffline = true;
	// 		return roff.post(userRepo, userToPost).then(function(result) {
	// 			return roff.get(userRepo).then(function(result) {
	// 				expect(result.length, "a lot of records").to.equal(301);
	// 				roff.forcedOffline = false;
	// 				return roff.get(userRepo).then(function(result) {
	// 					return roff.delete(userRepo+"/"+userToPost.id);
	// 				});
	// 		});
	// 		});
	// 	});
	// });

	// Reconciliation

	// Action              -  Server Only Change          | Client Only Change          | Change in Both
	// A   Post Insert     -  1 Get and Overwrite    DONE | 2 Write to Server      DONE | 3 Same primary key!!! Treat like reconciliation
	// B   Post/Put Update -  1 Get and Overwrite    DONE | 2 Write to Server      DONE | 3 Reconciliation
	// C   Delete          -  1 Delete Local         DONE | 2 Delete Remote        DONE | 3 Nothing to do  DONE
	// D     Other was Updated  1 Updated ? Do What? DONE |   2 Updated ? Do What? DONE

	it("70: A1, B1, C1: should reconcile when server has put/insert/post/delete\
					    changes and client has no changes\
					    and support setting primaryKeyName in options.", function() {

		var user01 = {
			"ID": "aedfa7a4-d748-11e5-b5d2-0a1d41d68511",
			"first_name": "Happy3",
			"last_name": "User3"
		};
		var user01Update = {
			"ID": "aedfa7a4-d748-11e5-b5d2-0a1d41d68511",
			"first_name": "Happy3",
			"last_name": "Position"
		};

		var user02 = {
			"ID": "4a30a4fb-b71e-4ef2-b430-d46f9af3f812",
			"first_name": "Existing",
			"last_name": "New Name"
		};

		var user02Post = {
			"ID": "4a30a4fb-b71e-4ef2-b430-d46f9af3f812",
			"first_name": "Existing",
			"last_name": "Posted"
		};

		var user03Delete = {
			"ID": "9783df16-0d70-4364-a1ee-3cb39818fd13",
			"first_name": "Joyous",
			"last_name": "WillDelete"
		};

		var user04New = {
			"ID": "9783df16-0d70-4364-a1ee-3cb39818fd14",
			"first_name": "Joyous",
			"last_name": "And New"
		};

		var userRepo = "users15";
		var roff = restlib.restoff({
			rootUri: ROOT_URI,
			dbService : {
				primaryKeyName : "not_used_id",
			}
		});

		roff.clear(userRepo, true);
		dbRepoShouldBeEqual(roff, userRepo, undefined, 0); // verify initial state
		return Promise.all([
			roff.post(userRepo, user01, {primaryKeyName:"ID"}),
			roff.post(userRepo, user02, {primaryKeyName:"ID"}),
			roff.post(userRepo, user03Delete, {primaryKeyName:"ID"}),
			roff.delete(userRepo + "/" + user04New.ID, {primaryKeyName:"ID"})
		]).then(function(result) { // Above 4 rest test
			return dbRepoExactlyEqual(roff, userRepo, true).then(function(dbEqualresult3) { // verify posted to server
				expect(dbEqualresult3, "db repo the same").to.equal(true);
				roff.persistenceDisabled = true; // Make updates without making them locally
				return Promise.all([
					roff.put(userRepo + "/" + user01Update.ID, user01Update, {primaryKeyName:"ID"}),
					roff.post(userRepo, user02Post, {primaryKeyName:"ID"}),
					roff.post(userRepo, user04New, {primaryKeyName:"ID"}),
					roff.delete(userRepo + "/" + user03Delete.ID, {primaryKeyName:"ID"})
				]).then(function() { // Above 4 rest test
					roff.persistenceDisabled = false;
					return dbRepoExactlyEqual(roff, userRepo, false).then(function(dbEqualResult) { // verify posted to server
						expect(dbEqualResult, "db repo the same").to.equal(false);
						return roff.get(userRepo, {primaryKeyName:"ID"}).then(function(getResult) {
							dbRepoShouldBeEqual(roff, userRepo, getResult, 3); // one was deleted one was added
							return dbRepoExactlyEqual(roff, userRepo, true).then(function(dbEqualResult2) { // verify posted to server
								expect(dbEqualResult2, "db repo the same").to.equal(true);
								return Promise.all([ // Return to prior dbState
									roff.post(userRepo, user01, {primaryKeyName:"ID"}),
									roff.post(userRepo, user02, {primaryKeyName:"ID"}),
									roff.post(userRepo, user03Delete, {primaryKeyName:"ID"})
								]).then(function() {
									pendingStatusCount(roff, 0);
									return roff.delete(userRepo + "/" + user04New.ID, {primaryKeyName:"ID"}).then(function() { // Above 4 restart test
									});
								});
							});
						});
					});
				});
			});
		});
	});

	it("71: A2, B2, C2: should reconcile when client has put/insert/post/delete\
					    changes and server has no changes.", function() {

		var emailA = {
			"ID": "aedfa7a4-d748-11e5-b5d2-0a1d41d68511",
			"first_name": "Happy3",
			"last_name": "Leave Alone"
		};

		var emailB = {
			"ID": "4a30a4fb-b71e-4ef2-b430-d46f9af3f812",
			"first_name": "Existing",
			"last_name": "Put New Value"
		};

		var emailBPut = {
			"ID": "4a30a4fb-b71e-4ef2-b430-d46f9af3f812",
			"first_name": "Existing",
			"last_name": "Putted the New Value"
		};

		var emailC = {
			"ID": "4a30a4fb-b71e-4ef2-b430-d46f9af3f813",
			"first_name": "Existing",
			"last_name": "Will Delete This One"
		};

		var emailD = {
			"ID": "9783df16-0d70-4364-a1ee-3cb39818fd14",
			"first_name": "Joyous",
			"last_name": "Post This One"
		};

		var emailAId = {
			"ID": "aedfa7a4-d748-11e5-b5d2-0a1d41d68511",
			"first_name": "Happy3",
			"last_name": "Leave Alone",
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68511"
		};

		var emailBId = {
			"ID": "4a30a4fb-b71e-4ef2-b430-d46f9af3f812",
			"first_name": "Existing",
			"last_name": "Put New Value",
			"id": "4a30a4fb-b71e-4ef2-b430-d46f9af3f812"
		};

		var emailBPutId = {
			"ID": "4a30a4fb-b71e-4ef2-b430-d46f9af3f812",
			"first_name": "Existing",
			"last_name": "Putted the New Value",
			"id": "4a30a4fb-b71e-4ef2-b430-d46f9af3f812"
		};

		var emailCId = {
			"ID": "4a30a4fb-b71e-4ef2-b430-d46f9af3f813",
			"first_name": "Existing",
			"last_name": "Will Delete This One",
			"id": "4a30a4fb-b71e-4ef2-b430-d46f9af3f813"
		};

		var emailDId = {
			"ID": "9783df16-0d70-4364-a1ee-3cb39818fd14",
			"first_name": "Joyous",
			"last_name": "Post This One",
			"id": "9783df16-0d70-4364-a1ee-3cb39818fd14"
		};

		var emailRepo = "emailAddresses01";

		var pendingCallBack = 0;
		var callBackAction;
		var callBackUri;
		var roff = restlib.restoff({
			"rootUri" : ROOT_URI,
			dbService : {
				primaryKeyName : "not_used_id",
			},
			onCallPending: function(pendingAction, uri) {
				pendingCallBack++;
				callBackAction = pendingAction;
				callBackUri = uri;
			}
		});

		roff.clear(emailRepo, true);
		return Promise.all([
			roff.post(emailRepo, emailA, {primaryKeyName:"ID"}),
			roff.post(emailRepo, emailB, {primaryKeyName:"ID"}),
			roff.post(emailRepo, emailC, {primaryKeyName:"ID"}),
			roff.delete(emailRepo + "/" + emailD.ID, {primaryKeyName:"ID"}),
		]).then(function() {
			return roff.get(emailRepo, {primaryKeyName:"ID"}).then(function(results) {
				expect(deepEqualOrderUnimportant([emailAId, emailBId, emailCId], results, "ID"), "initial setup should be correct").to.equal(true);
				roff.forcedOffline = true;
				return Promise.all([
					roff.put(emailRepo+"/"+emailBPut.ID, emailBPut, {primaryKeyName:"ID"}),
					roff.delete(emailRepo+"/"+emailC.ID, {primaryKeyName:"ID"}),
					roff.post(emailRepo, emailD, {primaryKeyName:"ID"}),
				]).then(function() {
					return pendingResourcesGet(roff, emailRepo).then(function(pending) {
						return roff.get(emailRepo).then(function(updatedResults) {
							expect(pending.length, "Should have 3 pending").to.equal(3);
							deepEqualOrderUnimportant([emailAId, emailBPutId, emailDId], updatedResults, "ID");
							roff.forcedOffline = false;
							return roff.get(emailRepo, {primaryKeyName:"ID"}).then(function(updatedResults) {
								return pendingResourcesGet(roff, emailRepo).then(function(pending) {
									expect(pending.length, "Should have nothing pending").to.equal(0);
									deepEqualOrderUnimportant([emailAId, emailBPutId, emailDId], updatedResults, "ID");
									pendingStatusCount(roff, 0);
									expect(pendingCallBack, "pending call back was called").to.equal(3);
									expect(callBackAction, "Should pass callBackAction").to.be.an("object");
									expect(callBackUri, "Should pass callBackUri").to.be.an("object");
									return Promise.all([
										roff.delete(emailRepo+"/"+emailA.ID, {primaryKeyName:"ID"}),
										roff.delete(emailRepo+"/"+emailB.ID, {primaryKeyName:"ID"}),
										roff.delete(emailRepo+"/"+emailC.ID, {primaryKeyName:"ID"}),
										roff.delete(emailRepo+"/"+emailD.ID, {primaryKeyName:"ID"})   // clean up
									]);
								});
							});
						});
					});
				});
			});
		});
	});

	it("72: D1, D2: should reconcile when client updated a server deleted record\
				   and reconcile when server updated a client deleted record\
				   and support primary key name in options", function() {

		var emailA = {
			"ID": "aedfa7a4-d748-11e5-b5d2-0a1d41d68511",
			"first_name": "Update One Client",
			"last_name": "Delete On Server",
			"changed_value": "Was A"
		};

		var emailAUpdated = {
			"ID": "aedfa7a4-d748-11e5-b5d2-0a1d41d68511",
			"first_name": "Update One Client",
			"last_name": "Delete On Server",
			"changed_value": "Now A2"
		};

		var emailB = {
			"ID": "4a30a4fb-b71e-4ef2-b430-d46f9af3f812",
			"first_name": "Update On Server",
			"last_name": "Delete On Client",
			"changed_value": "Was X"
		};

		var emailBUpdated = {
			"ID": "4a30a4fb-b71e-4ef2-b430-d46f9af3f812",
			"first_name": "Update On Server",
			"last_name": "Delete On Client",
			"changed_value": "Now X2"
		};

		var emailC = {
			"ID": "aedfa7a4-d748-11e5-b5d2-0a1d41d68516",
			"first_name": "Happy3",
			"last_name": "Leave Alone"
		};


		var emailRepo = "emailAddresses02";

		var roff = restlib.restoff({ "rootUri" : ROOT_URI }); // changes on this client
		var roff2 = restlib.restoff({ "rootUri" : ROOT_URI }); // Changes from "another" client

		roff.clear(emailRepo, true);
		return Promise.all([
			roff.post(emailRepo, emailA, {primaryKeyName:"ID"}),
			roff.post(emailRepo, emailB, {primaryKeyName:"ID"}),
			roff.post(emailRepo, emailC, {primaryKeyName:"ID"})
		]).then(function(results) {
			return roff.get(emailRepo).then(function(results) {
				expect(deepEqualOrderUnimportant([emailB, emailA, emailC], results, "id"), "initial setup should be correct").to.equal(true);
				roff.forcedOffline = true;
				return Promise.all([
					roff2.delete(emailRepo+"/"+emailA.id, {primaryKeyName:"ID"}), // "Other client" delete on server
					roff2.post(emailRepo, emailBUpdated, {primaryKeyName:"ID"}),  // "Other client" update on server
					roff.delete(emailRepo+"/"+emailB.id, {primaryKeyName:"ID"}),  // delete on client
					roff.post(emailRepo, emailAUpdated, {primaryKeyName:"ID"})    // updated on client
				]).then(function() {
					return Promise.all([
						roff2.get(emailRepo),
						roff.get(emailRepo)
					]).then(function(results) {
						var serverChanges = results[0];
						var clientChanges = results[1];
						expect(deepEqualOrderUnimportant([emailBUpdated, emailC], serverChanges, "id"), "server changes should be correct").to.equal(true);
						expect(deepEqualOrderUnimportant([emailAUpdated, emailC], clientChanges, "id"), "client changes should be correct").to.equal(true);

						roff.forcedOffline = false;
						return roff.get(emailRepo).then(function(results) {
							expect([emailC], "should only have the one unchanged record as the other two are deleted").to.deep.equals(results);
							pendingStatusCount(roff, 0);
							pendingStatusCount(roff2, 0);
							return roff.delete(emailRepo+"/"+emailC.id, {primaryKeyName:"ID"});
						});
					});
				});
			});
		});
	});

	// README: NOT PASSING? May be becuase the newly generated record with the new
	//         GUID is in the users20 repository. Stop Gulp, do a git checkout database/db.json
	//         and start gulp again.
	//         TODO: With backend test framework, figure out a way to clera out the entire repo
	//         before a test instead of deleting each repository item one at a time.
	it("73: A3, B3, C3: should reconcile when client and server have both\
						updated the same data by adding another record.\
					    should also call the onReconciliation callback.", function() {

		var emailA = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68400",
			"first_name": "No Changes emailA",
			"last_name": "Leave Alone"
		};


		var emailB = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68401",
			"first_name": "Update On emailB",
			"last_name": "Roff2 Client",
			"changed_value": "No Change"
		};

		var emailBUpdated = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68401",
			"first_name": "Update On emailBUpdated",
			"last_name": "Roff2 Client",
			"changed_value": "Now Roff2 Update B"
		};

		var emailC = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68402",
			"first_name": "Update On emailC",
			"last_name": "Roff Client",
			"changed_value": "No Change"
		};

		var emailCUpdated = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68402",
			"first_name": "Update On emailCUpdated",
			"last_name": "Roff Client",
			"changed_value": "Now Roff Update C"
		};

		var emailD = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68403",
			"first_name": "Update On emailD",
			"last_name": "Roff and Roff2 Client",
			"changed_value": "No Change"
		};

		var emailDRoffUpdate = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68403",
			"first_name": "Update On emailDRoffUpdate",
			"last_name": "Roff and Roff2 Client",
			"changed_value": "Now Roff Update D"
		};

		var emailDRoff2Update = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68403",
			"first_name": "Update On emailDRoff2Update",
			"last_name": "Roff and Roff2 Client",
			"changed_value": "Now Roff2 D"
		};

		var emailE = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68404",
			"first_name": "Update Then Deleted On emailE",
			"last_name": "Roff Client",
			"changed_value": "No Change"
		};


		var emailEUpdated = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68404",
			"first_name": "Update Then Deleted On emailEUpdated",
			"last_name": "Roff Client",
			"changed_value": "Now Roff Update E"
		};

		var emailF = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68405",
			"first_name": "Post on Roff emailF",
			"last_name": "Roff Client",
			"changed_value": "No Change"
		};

		var emailG = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68406",
			"first_name": "Post on Roff2 emailG",
			"last_name": "Roff2 Client",
			"changed_value": "No Change"
		};


		var repoName = "users20";


		var pendingRecFromReconcile;
		var roff = restlib.restoff({
			"rootUri" : ROOT_URI,
			dbService : {
				dbName : "restoff.json"
			},
			onReconciliation: function(pendingRec) {
				pendingRecFromReconcile = pendingRec;
			}
		}); // changes on this client
		var roff2 = restlib.restoff({
			"rootUri" : ROOT_URI,
			dbService : {
				dbName : "restoff2.json"
			}
		}); // Changes from "another" client

		roff.clear(repoName, true);
		roff2.clear(repoName, true);
		return Promise.all([ // clean and load the database for test
			roff.post(repoName, emailA),
			roff.post(repoName, emailB),
			roff.post(repoName, emailC),
			roff.post(repoName, emailD),
			roff.post(repoName, emailE),
		]).then(function() {
			roff.clear(repoName, true);
			roff2.clear(repoName, true);
			return Promise.all([
				roff.get(repoName),
				roff2.get(repoName)
			]).then(function(results) { // verify everything is ready to go
				var roffData = results[0];
				var roff2Data = results[1];
				expect(deepEqualOrderUnimportant([emailA, emailB, emailC, emailD, emailE], roffData, "id"), "initial setup should be correct").to.equal(true);
				expect(deepEqualOrderUnimportant([emailA, emailB, emailC, emailD, emailE], roff2Data, "id"), "initial setup should be correct").to.equal(true);
				roff.forcedOffline = true;
				roff2.forcedOffline = true;
				return Promise.all([ // do the updates offline
					roff.post(repoName, emailCUpdated),
					roff.put(repoName+"/"+emailDRoffUpdate.id, emailDRoffUpdate),
					roff.post(repoName, emailEUpdated),
					roff2.put(repoName+"/"+emailBUpdated.id, emailBUpdated),
					roff2.post(repoName, emailDRoff2Update),
					roff.post(repoName, emailF),
					roff2.post(repoName, emailG)
				]).then(function(results) {
					return roff.delete(repoName+"/"+emailEUpdated.id).then(function() { // can't assure order of Promise.all so do the delete when above promise.all is done.
						return Promise.all([
							roff.get(repoName),
							roff2.get(repoName)
						]).then(function(results) { // verify everything updated correctly while offline
							var roffData = results[0];
							var roff2Data = results[1];
							expect(deepEqualOrderUnimportant([emailA, emailB, emailCUpdated, emailDRoffUpdate, emailF], roffData, "id"), "initial offline update should be correct").to.equal(true);
							expect(deepEqualOrderUnimportant([emailA, emailBUpdated, emailC, emailDRoff2Update, emailE, emailG], roff2Data, "id"), "initial offline update should be correct").to.equal(true);
							roff2.forcedOffline = false;
							return roff2.get(repoName).then(function(resultRoff2) { // can't use promise because the order of promise is unknown so do roff2 first (simulate roff being synced after roff2)
								// console.log("roff2Data %O Expected %O", resultRoff2, [emailA, emailBUpdated, emailC, emailDRoff2Update, emailE, emailG]);
								expect(deepEqualOrderUnimportant([emailA, emailBUpdated, emailC, emailDRoff2Update, emailE, emailG], resultRoff2, "id"), "roff2 get results should still be same as last expect(deepEqualOrderUnimportant) becuse no changes have occured on the server yet.").to.equal(true);
								roff.forcedOffline = false;
								return roff.get(repoName).then(function(resultRoff) { // order of promise is unknown so now do roff
									expect(pendingRecFromReconcile, "onReconciliation should have been called.").to.be.an("object"); // not undefined because of closure magic

									// console.log("roffData %O Expected %O", resultRoff, [emailA, emailBUpdated, emailCUpdated, emailDRoffUpdate, emailDRoff2Update, emailF, emailG]);


									// emailDRoffUpdate.id = pendingRecFromReconcile.primaryKey;
									// emailA - Should be same becuase no changes on either side.
									// emailBUpdated - Updated on Roff2 should have been brought over
									// emailCUpdated - Updated on Roff should have been left
									// emailDRoffUpdate, emailDRoff2Update - Both sides so both emailDRoff2Update and emailDRoffUpdate should be in the list
									// NO emailE - Update then delete on client so should not be in the list
									// emailF - New posted item in Roff so should be here
									// emailG - New posted item in Roff2 so should now be here in Roff
									expect(deepEqualOrderUnimportant([emailA, emailBUpdated, emailCUpdated, emailDRoffUpdate, emailDRoff2Update, emailF, emailG], resultRoff, "id"), "roff get should merge differences.").to.equal(true);
									expect(deepEqualOrderUnimportant([emailA, emailBUpdated, emailCUpdated, emailDRoffUpdate, emailDRoff2Update, emailF, emailG], roff.dbService.dbRepo.read(repoName), "id"), "repo should be valid.").to.equal(true);

									return roff2.get(repoName).then(function(result2Roff) { // order of promise is unknown so now do roff

										expect(deepEqualOrderUnimportant([emailA, emailBUpdated, emailCUpdated, emailDRoffUpdate, emailDRoff2Update, emailF, emailG], resultRoff, "id"), "roff2 get should merge differences.").to.equal(true);
										expect(deepEqualOrderUnimportant([emailA, emailBUpdated, emailCUpdated, emailDRoffUpdate, emailDRoff2Update, emailF, emailG], roff2.dbService.dbRepo.read(repoName), "id"), "repo should be valid.").to.equal(true);

										expect(deepEqualOrderUnimportant(roff.dbService.dbRepo.read(repoName), roff2.dbService.dbRepo.read(repoName), "id"), "two repos should be equal.").to.equal(true);

										return dbRepoExactlyEqual(roff, repoName, true).then(function(result) {
											expect(result, "db repo the same").to.equal(true);
											pendingStatusCount(roff, 0);
											pendingStatusCount(roff2, 0);

											return Promise.all([ // clean up
												roff.delete(repoName+"/"+emailA.id),
												roff.delete(repoName+"/"+emailB.id),
												roff.delete(repoName+"/"+emailC.id),
												roff.delete(repoName+"/"+emailD.id),
												roff.delete(repoName+"/"+emailE.id),
												roff.delete(repoName+"/"+emailF.id),
												roff.delete(repoName+"/"+emailG.id),
												roff.delete(repoName+"/"+pendingRecFromReconcile.primaryKey)
											]);
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});

	it("74: should handle merging a delete on the sever while we still have pending changes.\
	        and should support optional primary key names ", function() {

		var emailA = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68300",
			"first_name": "No Changes emailA",
			"last_name": "Leave Alone"
		};

		var emailB = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68301",
			"first_name": "No Changes emailA",
			"last_name": "Post In A"
		};

		var repoName = "users21";


		var roff = restlib.restoff({
			"rootUri" : ROOT_URI,
			dbService : {
				dbName : "restoff.json"
			},
			onReconciliation: function(pendingRec) {
				pendingRecFromReconcile = pendingRec;
			}
		}); // changes on this client
		var roff2 = restlib.restoff({
			"rootUri" : ROOT_URI,
			dbService : {
				dbName : "restoff2.json"
			}
		}); // Changes from "another" client

		roff.clear(repoName, true);
		roff2.clear(repoName, true);
		return Promise.all([ // clean and load the database for test
			roff.delete(repoName+"/"+emailB.id),
			roff.post(repoName, emailA)
		]).then(function() {
			roff.clear(repoName, true);
			roff2.clear(repoName, true);
			return Promise.all([
				roff.get(repoName),
				roff2.get(repoName)
			]).then(function(results) { // verify everything is ready to go
				var roffData = results[0];
				var roff2Data = results[1];
				expect(deepEqualOrderUnimportant([emailA], roffData, "id"), "initial setup should be correct").to.equal(true);
				expect(deepEqualOrderUnimportant([emailA], roff2Data, "id"), "initial setup should be correct").to.equal(true);
				roff.forcedOffline = true;
				roff2.forcedOffline = true;
				return roff2.delete(repoName+"/"+emailA.id).then(function() {
					return Promise.all([
						roff.get(repoName),
						roff2.get(repoName)
					]).then(function(results) { // verify everything updated correctly while offline
						var roffData = results[0];
						var roff2Data = results[1];
						expect([], "should be empty").to.deep.equals(roff2Data);
						expect(deepEqualOrderUnimportant([emailA], roffData, "id"), "initial setup should be correct").to.equal(true);
						roff2.forcedOffline = false;
						return roff2.get(repoName).then(function(result) {
							expect([], "should be empty").to.deep.equals(result);
							return dbRepoExactlyEqual(roff2, repoName, true).then(function(result) {
								expect(result, "db repo2 the same").to.equal(true);
								return roff.post(repoName, emailB).then(function(result) { // get something pending so we get merging going on
									expect(emailB, "should be equal").to.deep.equals(result);
									roff.forcedOffline = false;
									return roff.get(repoName).then(function(result) {
										expect([emailB], "should be empty").to.deep.equals(result);
										return dbRepoExactlyEqual(roff, repoName, true).then(function(result) {
											expect(result, "db repo2 the same").to.equal(true);
											pendingStatusCount(roff, 0);
											pendingStatusCount(roff2, 0);
											return roff.delete(repoName+"/"+emailB.id);
										});
									});
								});
							});
						});
					});
				});
			});
		});
	});

	it("75: should handle, while offline, adding a resource and then\
			deleting it. The resource never ends up on the server.\
			Pending should also have no more items.", function() {

		var emailA = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68300",
			"first_name": "No Changes emailA",
			"last_name": "Leave Alone"
		};

		var emailB = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68301",
			"first_name": "No Changes emailA",
			"last_name": "Post In A"
		};

		var repoName = "users21";

		var roff = restlib.restoff({
			"rootUri" : ROOT_URI,
			dbService : {
				dbName : "restoff.json"
			},
			onReconciliation: function(pendingRec) {
				pendingRecFromReconcile = pendingRec;
			}
		}); // changes on this client

		roff.clear(repoName, true);
		return Promise.all([ // clean and load the database for test
			roff.delete(repoName+"/"+emailB.id),
			roff.delete(repoName+"/"+emailA.id)
		]).then(function() {
			pendingStatusCount(roff, 0);
			roff.clear(repoName, true);
			return Promise.all([
				roff.get(repoName)
			]).then(function(results) { // verify everything is ready to go
				var roffData = results[0];
				expect(roffData, "empty to start with").to.deep.equals([]);
				roff.forcedOffline = true;
				return Promise.all([
					roff.post(repoName, emailA),
					roff.post(repoName, emailB) // Add two items while offline so we have a pending
				]).then(function() {
					return roff.delete(repoName+"/"+emailB.id).then(function () {
						roff.forcedOffline = false;
						return roff.get(repoName).then(function(result) {
							expect([emailA], "should have one record").to.deep.equals(result);
							return dbRepoExactlyEqual(roff, repoName, true).then(function(result) {
								expect(result, "db repo2 the same").to.equal(true);
								return dbRepoExactlyEqual(roff, repoName, true).then(function(result) {
									expect(result, "db repo2 the same").to.equal(true);
									pendingStatusCount(roff, 0);
									return roff.delete(repoName+"/"+emailA.id);
								});
							});
						});
					});
				});
			});
		});
	});

	// // Actual offline test: Comment out this code and make sure your internet
	// // connection is turned off
	// it("99: should work offline when it is 'really' offline", function() {
	// 	var roff = restlib.restoff();

	// 	return roff.get("http://jsonplaceholder.typicode.com/posts").then(function(result){
	// 		expect(true, "Promise should call the catch.", false);
	// 	}).catch(function (error) {
	// 		var errorExpected = {
	// 			message: "Network Error",
	// 			messageDetail: "",
	// 			status: 0,
	// 			uri: "http://jsonplaceholder.typicode.com/posts"
	// 		};
	// 		onlineStatusShouldEqual(roff, false);
	// 		expect(error, "Offlinedata").to.deep.equals(errorExpected);
	// 	});
	// });


	function showRepoContents(roff, repoName) {
		console.log("CHECKING " + repoName);
		console.log (roff.dbService.dbRepo.read(repoName));
	}

	function showResultContents(results) {
		console.log(results);
	}

	// Test Helpers

	function pendingResourcesGet(roff, repoName) {
		var pendingUri = "pending?repoName=" + repoName;
		return roff.get(pendingUri, {rootUri:"http://localhost/",clientOnly:true});
	}

	function pendingStatusCorrect(roff, resource, callAction, statusPosition, finalUri, repoName) {
		// README!: Only one status of each kind can be pending during a test
		var pendings = roff.dbService.dbRepo.read("pending");
		var status;
		pendings.forEach(function(item) {
			if (callAction === item.restMethod) {
				status = item;
			}
		});

		expect(pendings.length, "pending post").to.not.equal(0);
		expect(status.restMethod, "status restMethod").to.equal(callAction);
		expect(deepEqual(status.resources, resource), "status resource").to.equal(true);
		expect(status.clientTime, "status resource").to.be.an("date");
		expect(status.uri, "status uri").to.equal(finalUri);
		expect(status.repoName, "status repoName").to.equal(repoName);
	}


	function pendingStatusCount(roff, count, action) {
		var pendings = roff.dbService.dbRepo.read("pending");
		expect(pendings.length, "pending post").to.equal(count);
	}

	function dbRepoShouldBeEmptyAndResourceNotEmpty(roff, repoName, resource) {
		expect(roff.dbService.dbRepo.length(repoName), repoName + " db length").to.equal(0);
		expect(resource.length, repoName + " repo length").to.not.equal(0);
	}

	function dbRepoShouldBeEqual(roff, repoName, resource, len, pkName) {
		if (undefined === pkName) {
			pkName = "id";
		}

		expect(roff.dbService.dbRepo.length(repoName), repoName + " repo and db length").to.equal(len);
		if (undefined !== resource)  {
			expect(dbResourceCompare(roff, repoName, resource, true, pkName), "db repo the same").to.equal(true);
		}
	}

	function dbRepoExactlyEqual(roff, repoName, similarExpected, pkName) {
		if (undefined === pkName) {
			pkName = "id";
		}

		var promise = new Promise(function(resolve, reject) {
			// Verify client persisted database for repository is exactly equal
			// to the table/data in the servers database
			var roffDisabled = restlib.restoff({
				"rootUri" : ROOT_URI,
				"persistenceDisabled" : true // Don't store the results anywhere
			});

			return roffDisabled.get(repoName).then(function(result) {
				// roff.persistenceDisabled = false; // to read db results
				resolve(dbResourceCompare(roff, repoName, result, similarExpected, pkName));
			});
		});
		return promise;
	}

	function dbResourceCompare(roff, repoName, resources, similarExpected, pkName) {
		var result = true;
		if (!(resources instanceof Array)) { // Make code easy: Always make it an array
			resources = [resources];
		}

		if (null === roff.dbService.dbRepo) {
			console.log("WARNING! persistenceDisabled is disabled. Please enable before comparing databases.");
			return !similarExpected;
		}

		var dbSize = roff.dbService.dbRepo.length(repoName);
		if (dbSize !== resources.length) {
			if (similarExpected) {
				console.log ("Expected dbSize of " + dbSize + " to equal resource size of " + resources.length + " for repository " + repoName + ".");
				console.log("Mismatch between client and server database!!! Resource returned %O. Database %O", resources, roff.dbService.dbRepo.read(repoName));
			}
			result = false;
		}

		resources.forEach(function(resource, position) {
			// var primaryKey = roff._primaryKeyFor(resource);
			var primaryKey = resource[pkName];
			var dbResource = roff.dbService.dbRepo.find(repoName, pkName, primaryKey);

			if (false === deepEqual(resource, dbResource)) {
				if (similarExpected) {
					console.log("Mismatch between client and server database!!! Client %O and server %O", resource, dbResource);
				}
				result = false;
			}
		});
		return result;
	}

});
