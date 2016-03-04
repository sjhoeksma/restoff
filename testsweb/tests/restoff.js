describe ("restoff", function() {

	var ROOT_URI = "http://test.development.com:3000/";

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
		onlineStatusShouldEqual(roff, false, false, true, false);
	});

	it("03: should handle config settings correctly", function() {
		var roff = restlib.restoff();
		expect(roff.dbService, "dbService").to.be.an("object");

		expect(roff.rootUri, "rootUri").to.equal("");
		roff.rootUri = ROOT_URI;
		expect(roff.rootUri, "rootUri").to.equal(ROOT_URI);

		expect(roff.primaryKeyName, "primaryKeyName").to.equal("id");
		roff.primaryKeyName = "id3";
		expect(roff.primaryKeyName, "primaryKeyName").to.equal("id3");

		expect(roff.clientOnly, "clientOnly").to.be.false;
		roff.clientOnly = true;
		expect(roff.clientOnly, "clientOnly").to.be.true;

		expect(roff.forcedOffline, "forcedOffline").to.be.false;
		roff.forcedOffline = true;
		expect(roff.forcedOffline, "forcedOffline").to.be.true;

		expect(roff.pendingUri, "pendingUri").to.equal("http://localhost/");
		expect(roff.pendingRepoName, "pendingRepoName").to.equal("pending");

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
		expect(roff2.primaryKeyName, "primaryKeyName").to.equal("id2");
		expect(roff2.clientOnly, "clientOnly").to.be.true;
		expect(roff2.forcedOffline, "forcedOffline").to.be.true;
		expect(roff2.pendingUri, "pendingUri").to.equal("http://notlocalhost/pending/");
		expect(roff2.pendingRepoName, "pendingRepoName").to.equal("pending2");
	});

	it("04: get should, when online, get multiple resources\
		    and store them on the client,\
		    clear a single repository\
			support a rootUri configuration,\
		    have correct online statuses\
		    and still be available when offline", function() {
		var userRepo = "users11";
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		return roff.clear(userRepo, true).then(function(result) {
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			onlineStatusShouldEqual(roff, false, false, true, false);
			return roff.get(userRepo).then(function(result) {
				onlineStatusShouldEqual(roff, true, false, false, false);
				dbRepoShouldBeEqual(roff, userRepo, result, 3);
				return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) {
					expect(result, "db repo the same").to.be.true;
					roff.forcedOffline = true;
					onlineStatusShouldEqual(roff, false, false, true, true);
					return roff.get(userRepo).then(function(result){
						dbRepoShouldBeEqual(roff, userRepo, result, 3);
						onlineStatusShouldEqual(roff, false, true, false, true);
					});
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
		return roff.clearAll(true).then(function(result) {
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			return roff.get(ROOT_URI + userRepo).then(function(result) {
				dbRepoShouldBeEqual(roff, userRepo, result, 1);
				return roff.get(userRepo2).then(function(result2){
					dbRepoShouldBeEqual(roff, userRepo2, result2, 3);
					dbRepoShouldBeEqual(roff, userRepo, result, 1);
					return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) {
						expect(result, "db repo the same").to.be.true;
						return roff.clearAll(true).then(function(result) {
							dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
						});	
					});

				});
			});
		});			
	});

	it("06: get should, when online, handle network errors", function() {
		var roff = restlib.restoff({
			rootUri: "http://idontexisthopefully.com/"
		});
		return roff.clearAll(true).then(function(result) {
			return roff.get("http://idontexisthopefully.com/endpoint").then(function(result) {
				expect(true, "Promise should call the catch.").to.be.false;			
			}).catch(function(error) {
				var errorExpected = {
					message: "Network Error",
					messageDetail: "",
					status: 0,
					uri: "http://idontexisthopefully.com/endpoint"
				};
				expect(error, "Error result").to.deep.equals(errorExpected);
				onlineStatusShouldEqual(roff, false, false, true, false);
			});
		});
	});

	it("07: get should, when online, handle 404\
		    and when offline create a repository", function() {
		var userRepo = "users100";

		var roff = restlib.restoff({
			"rootUri" : ROOT_URI
		});
		return roff.clearAll(true).then(function(result) {
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
				roff.forcedOffline = true;
				return roff.get(userRepo).then(function(result) {
					expect(roff.dbService.dbRepo.length(userRepo), "repository should exist").to.equal(0);
				});
			});
		});
	});

	it("08: get should support enabling and disabling of the\
			persistance engine. No information should be\
			persisted on a get. When offline, nothing should\
			be retrieved.", function() {
		// TODO: Add Post, Delete, Put
		var roffParam = restlib.restoff();

		expect(roffParam.persistanceDisabled, "persistanceDisabled").to.equal(false);
		expect(roffParam.dbService, "dbService").to.be.an("object");
		roffParam.persistanceDisabled = true;
		expect(roffParam.persistanceDisabled, "persistanceDisabled").to.equal(true);
		expect(roffParam.dbService, "dbService").to.be.an("object");
		roffParam.persistanceDisabled = false;
		expect(roffParam.dbService, "dbService").to.be.an("object");

		var roffParam2 = restlib.restoff({
			"persistanceDisabled" : true
		});
		
		expect(roffParam2.persistanceDisabled, "persistanceDisabled").to.equal(true);

		var userRepo = "users11";
		var roff = restlib.restoff({
			"rootUri" : ROOT_URI,
			"persistanceDisabled" : false // to run clear and read db results
		});
		return roff.clear(userRepo, true).then(function(result) {
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			roff.persistanceDisabled = true;
			return roff.get(userRepo).then(function(result) {
				roff.persistanceDisabled = false; // to read db results
				dbRepoShouldBeEmptyAndResourceNotEmpty(roff, userRepo, result);
				roff.persistanceDisabled = true;
				roff.forcedOffline = true;
				return roff.get(userRepo).then(function(result2) {
					roff.persistanceDisabled = false; // to read db results
					dbRepoShouldBeEqual(roff, userRepo, result2, 0); // when offline repo is also empty
				});
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
			dbRepoShouldBeEqual(roff, "addresses", addresses, 1);
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
			result in those get being added to the client\
			repository.", function () {

		var userReturned =  {
			"id": "4a30a4fb-b71e-4ef2-b430-d46f9af3f8fa",
			"first_name": "Existing",
			"last_name": "New Name"
		};

		var usersReturned = [userReturned];

		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		var userRepo = "users11";

		return roff.clearAll(true).then(function(result) {
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			return roff.get(userRepo).then(function(users) {
				dbRepoShouldBeEqual(roff, userRepo, users, 3);
				return roff.get(userRepo + "/" + "4a30a4fb-b71e-4ef2-b430-d46f9af3f8fa").then(function (userOnline) {
					dbRepoShouldBeEqual(roff, userRepo, users, 3); // no changes to existing repository
					expect(deepEqual(userReturned, userOnline), " users returned should be the same").to.be.true;
					roff.forcedOffline = true;
					return roff.get(userRepo + "/" + "4a30a4fb-b71e-4ef2-b430-d46f9af3f8fa").then(function (userWhileOffline) {
						dbRepoShouldBeEqual(roff, userRepo, users, 3); // no changes to existing repository
						expect(deepEqual(usersReturned, userWhileOffline), " users returned should be the same").to.be.true;
					});
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
		}

		var pendingRecs = [pendingRec];

		return roff.clearAll(true).then(function(result) {		
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
		}
		return roff.delete(pendingRepo + "/" + pendingRec.id).then(function(idDeleted) { // reset test for delete
			expect(idDeleted, "should return id deleted").to.equal(pendingRec.id);
			expect(roff.dbService.dbRepo.length(pendingRepo), "should have no records").to.equal(0);
			return roff.get(userRepo, {clientOnly:true}).then(function(result) { // useres11 is still a client
				expect(roff.dbService.dbRepo.length(userRepo), "repository should be empty when clientOnly is true").to.equal(0); // client only
				return roff.post(pendingRepo, pendingRec, {clientOnly:true}).then(function(result) {
					expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have one record").to.equal(1);
					pendingStatusCount(roff,0,"post"); // should have no pending
					return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
						expect(result, "clientOnly was true so should not be equal").to.be.false;
						return roff.put(pendingRepo + "/" + pendingRec.id, pendingRec, {clientOnly:true}).then(function(result) {
							expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have one record").to.equal(1);
							pendingStatusCount(roff,0,"put"); // should have no pending
							return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
								expect(result, "clientOnly was true so should not be equal").to.be.false;
								return roff.post(pendingRepo, pendingRec).then(function(result) {
									expect(roff.dbService.dbRepo.length(pendingRepo), "should have just one record").to.equal(1);
									return dbRepoExactlyEqual(roff, pendingRepo, true).then(function(result) {
										expect(result, "Initial db/repo to be equal").to.be.true;
										return roff.delete(pendingRepo + "/" + pendingRec.id, {clientOnly:true}).then(function(idDeleted) { // for delete, while clientOnly, shoud not delete
											expect(idDeleted, "should return id deleted").to.equal(pendingRec.id);
											expect(roff.dbService.dbRepo.length(pendingRepo), "repository should be empty when clientOnly is true").to.equal(0);
											pendingStatusCount(roff,0,"delete"); // should have no pending
											return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
												expect(result, "db/repo should not be equal when clientOnly").to.be.false;
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
		}
		return roff.clearAll(true).then(function(result) {		
			return roff.delete(pendingRepo + "/" + pendingRec.id).then(function() { // reset test for delete
				expect(roff.dbService.dbRepo.length(pendingRepo), "should have just one record").to.equal(0);
				return roff.get(userRepo, {forcedOffline:true}).then(function(result) { // useres11 is still a client
					expect(roff.dbService.dbRepo.length(userRepo), "repository should be empty when forcedOffline is true").to.equal(0); // forcedOffline
					return roff.post(pendingRepo, pendingRec, {forcedOffline:true}).then(function(result) {
						expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have one record").to.equal(1);
						pendingStatusCount(roff, 1, "post"); // should have one pending
						return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
							expect(result, "forcedOffline was true so should not be equal").to.be.false;
							return roff.put(pendingRepo + "/" + pendingRec.id, pendingRec, {forcedOffline:true}).then(function(result) {
								expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have one record").to.equal(1);
								pendingStatusCount(roff, 2, "put"); // should have two pending
								return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
									expect(result, "forcedOffline was true so should not be equal").to.be.false;
									return roff.post(pendingRepo, pendingRec).then(function(result) {
										expect(roff.dbService.dbRepo.length(pendingRepo), "should have just one record").to.equal(1);
										return dbRepoExactlyEqual(roff, pendingRepo, true).then(function(result) {
											expect(result, "Initial db/repo to be equal").to.be.true;
											return roff.delete(pendingRepo + "/" + pendingRec.id, {forcedOffline:true}).then(function() { // for delete, while forcedOffline, should not delete
												expect(roff.dbService.dbRepo.length(pendingRepo), "repository should be empty when forcedOffline is true").to.equal(0);
												pendingStatusCount(roff, 3, "delete"); // should have three pending
												return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
													expect(result, "db/repo should not be equal when forcedOffline").to.be.false;
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
	});

	it("17: get, when persistanceDisabled properties are true, should not persist the data locally\
			and there SHOULD BE no pending changes for update/put/delete.\
			persistanceDisabled is ignored for get", function() {

		var roff = restlib.restoff({
			"rootUri" : ROOT_URI
		});
		var userRepo = "users11";
		var pendingRepo = "persistanceDisabled";

		var pendingRec = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd13",
			"restMethod" : "PUT",
			"uri" : "http://www.whatever.com"
		}
		return roff.clearAll(true).then(function(result) {		
			return roff.delete(pendingRepo + "/" + pendingRec.id).then(function() { // reset test for delete
				expect(roff.dbService.dbRepo.length(pendingRepo), "should have just one record").to.equal(0);
				return roff.get(userRepo, {forcedOffline: false, persistanceDisabled:false}).then(function(result) { // useres11 is still a client
					expect(roff.dbService.dbRepo.length(userRepo), "repository should be empty when persistanceDisabled is true").to.equal(3);
					return roff.get(userRepo, {forcedOffline: true, persistanceDisabled:true}).then(function(result) { // useres11 is still a client
						expect(result.length, "repository should be empty when persistanceDisabled is true").to.equal(0);
						return roff.post(pendingRepo, pendingRec, {forcedOffline: true, persistanceDisabled:true}).then(function(result) {
							expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have no records").to.equal(0);
							pendingStatusCount(roff, 0, "post"); // should have no pending
							return roff.post(pendingRepo, pendingRec, {persistanceDisabled:true}).then(function(result) {
								expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have no records").to.equal(0);
								pendingStatusCount(roff, 0, "post 2nd"); // should have no pending

								return roff.put(pendingRepo + "/" + pendingRec.id, pendingRec, {persistanceDisabled:true}).then(function(result) {
									expect(roff.dbService.dbRepo.length(pendingRepo), "repository should not have one record").to.equal(0);
									pendingStatusCount(roff, 0, "put"); // should have no pending
									return dbRepoExactlyEqual(roff, pendingRepo, false).then(function(result) {
										expect(result, "persistanceDisabled was true so should not be equal").to.be.false;
										return roff.post(pendingRepo, pendingRec).then(function(result) { // get a post in the repo so we can test that delete doesn't remove it
											expect(roff.dbService.dbRepo.length(pendingRepo), "repository should have one record").to.equal(1);
											return roff.delete(pendingRepo + "/" + pendingRec.id, {persistanceDisabled:true}).then(function() { // for delete, while persistanceDisabled, should delete
												expect(roff.dbService.dbRepo.length(pendingRepo), "repository should be empty when persistanceDisabled is true").to.equal(1); // should not delete from repo
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
		}
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
		}

		var pendingRec2 = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd15",
			"restMethod" : "PUT",
			"uri" : "http://localhost/pending/"
		}

		var pendingRec3 = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd14",
			"restMethod" : "GET",
			"uri" : "http://localhost/pending/"
		}

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

		return roff.clear(userRepo, true).then(function(result) {		
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

			return roff.post(userRepo, newuser01).then(function(updatedResult) {
				dbRepoShouldBeEqual(roff, userRepo, updatedResult, 1);
				return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) { // verify posted to server
					expect(result, "db repo the same").to.be.true;
				});
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
		return roff.clear(userRepo, true).then(function(result) {
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			
			return roff.post(userRepo, existingUser).then(function(result) { // reset test just in case
				onlineStatusShouldEqual(roff, true, false, false, false);
				dbRepoShouldBeEqual(roff, userRepo, result, 1);
				return roff.clear(userRepo, true).then(function(result) { // Clean up just in case
					dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
					return roff.get(userRepo).then(function(result) {
						dbRepoShouldBeEqual(roff, userRepo, result, 1);
						return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) { // verify posted to server
							expect(result, "db repo the same").to.be.true;
							return roff.post(userRepo, editedUser).then(function(result) {
								dbRepoShouldBeEqual(roff, userRepo, result, 1);
								return roff.post(userRepo, existingUser).then(function(result) { // rest test again
									dbRepoShouldBeEqual(roff, userRepo, result, 1);
									return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) { // verify posted to server
										expect(result, "db repo the same").to.be.true;
									});
								});
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
		return roff.clearAll(true).then(function(result) {
			return roff.post("http://idontexisthopefully.com/resource", newuser01).then(function(result) {
				expect(true, "Promise should call the catch.").to.be.false;			
			}).catch(function(error) {
				var errorExpected = {
					message: "Network Error",
					messageDetail: "",
					status: 0,
					uri: "http://idontexisthopefully.com/resource"
				};
				expect(error, "Error result").to.deep.equals(errorExpected);
				onlineStatusShouldEqual(roff, false, false, true, false);
			});
		});
	});

	it("33: post should, when online, handle 404s\
		and NOT persist the resource in the database", function() {
		var userRepo = "users44";
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		return roff.clearAll(true).then(function(result) {		
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

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
				dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
				onlineStatusShouldEqual(roff, true, false, false, false);
			});
		});
	});

	it("34: post should, when offline,\
		post a new sesource on the client and,\
		add the request to pending,\
		and clearAll should fail when force is false\
		and clear repo should fail when force is false", function() {

		var userRepo = "users200";
		var roff = restlib.restoff({
			"rootUri" : ROOT_URI,
			forcedOffline : true
		});
		return roff.clear(userRepo, true).then(function(result) {		
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

			return roff.post(userRepo, newuser01).then(function(result) {
				onlineStatusShouldEqual(roff, false, true, false, true);
				dbRepoShouldBeEqual(roff, userRepo, result, 1);
				pendingStatusCorrect(roff, result, "POST", 0, ROOT_URI + userRepo, userRepo);
				return roff.clear(userRepo).then(function(result) {
						expect(true,"Catch promise should have been called").to.equal(false);
					}).catch(function(error) {
					expect(error, "correct error message").to.equal("Submit pending changes before clearing database or call clear(repoName, true) to force.");
					return roff.clearAll().then(function(result) {
						expect(true,"Catch promise should have been called").to.equal(false);
					}).catch(function(error) {
						expect(error, "correct error message").to.equal("Submit pending changes before clearing database or call clearAll(true) to force.");
						dbRepoShouldBeEqual(roff, userRepo, result, 1);
						return roff.clearAll(true).then(function(result) {
							dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
							pendingStatusCount(roff,0,"clear all");
							return roff.post(userRepo, newuser01).then(function(result) {
								dbRepoShouldBeEqual(roff, userRepo, result, 1);
								return roff.post("user201", newuser01).then(function(result) { // get another pending so we can test clearing of just one repo
									pendingStatusCount(roff, 2, "post");
									dbRepoShouldBeEqual(roff, "user201", result, 1);
									return roff.clear("user201", true).then(function(result) {
										pendingStatusCount(roff, 1, "clear"); // should clear only one pending
									});
								});
							});
						});
					});
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
		return roff.clear(userRepo, true).then(function(result) {		
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

			return roff.put(userRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68510", expectedUser).then(function(result) {
				expect(true, "Promise should call the catch.").to.be.false;
			}).catch(function(error) {
				var errorExpected = {
					message: "Not Found",
					messageDetail: "{}",
					status: 404,
					uri: "http://test.development.com:3000/users11/aedfa7a4-d748-11e5-b5d2-0a1d41d68510"
				};
				expect(error, "Error result").to.deep.equals(errorExpected);
				dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
				onlineStatusShouldEqual(roff, true, false, false, false);
			});
		});
	});

	it("51: put should, when online, handle network errors", function() {
		var roff = restlib.restoff({
			rootUri: "http://idontexisthopefully.com/"
		});
		return roff.clearAll(true).then(function(result) {		
			return roff.put("http://idontexisthopefully.com/users/aedfa7a4-d748-11e5-b5d2-0a1d41d68510", newuser01).then(function(result) {
				expect(true, "Promise should call the catch.").to.be.false;			
			}).catch(function(error) {
				var errorExpected = {
					message: "Network Error",
					messageDetail: "",
					status: 0,
					uri: "http://idontexisthopefully.com/users/aedfa7a4-d748-11e5-b5d2-0a1d41d68510"
				};
				expect(error, "Error result").to.deep.equals(errorExpected);
				onlineStatusShouldEqual(roff, false, false, true, false);
			});
		});
	});


	it("52: put should, when online and with a blank repo,\
		    put an existing resource on the server and local repository", function() {
		var userRepo = "users07";
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		return roff.clear(userRepo, true).then(function(result) {		
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
			onlineStatusShouldEqual(roff, false, false, true, false);

			// Assure test data is in the database
			return roff.put(userRepo + "/" + existingUser01.id, existingUser01).then(function(result) {
				onlineStatusShouldEqual(roff, true, false, false, false);
				dbRepoShouldBeEqual(roff, userRepo, result, 1);
				return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) { // verify posted to server
					expect(result, "db repo the same").to.be.true;
					return roff.put(userRepo + "/" + puttedUser.id, puttedUser).then(function(result) {
						dbRepoShouldBeEqual(roff, userRepo, result, 1);
						return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) { // verify posted to server
							expect(result, "db repo the same").to.be.true;
							existingUser01.last_name = "User3"; // TODO: Figure out why last_name of existingUser01 gets set to "putted".
							return roff.put(userRepo + "/" + existingUser01.id, existingUser01).then(function(result) {
								dbRepoShouldBeEqual(roff, userRepo, result, 1);
							}); // Reset test with original data
						});
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
		return roff.clear(userRepo, true).then(function(result) {		
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			return roff.get(userRepo).then(function(getResults) {
				dbRepoShouldBeEqual(roff, userRepo, getResults, 3);
				roff.forcedOffline = true;
				onlineStatusShouldEqual(roff, false, false, true, true);

				return roff.put(userRepo+"/"+newUser.id, newUser).catch(function(error) {
					var errorExpected = {
						message: "Not Found",
						messageDetail: "",
						status: 404,
						uri: "http://test.development.com:3000/" + userRepo + "/"+newUser.id
					};

					expect(error, "Error result").to.deep.equals(errorExpected);
					onlineStatusShouldEqual(roff, false, true, false, true);
					return roff.put(userRepo+"/"+puttedUser.id, puttedUser).then(function(result) {
						var repoResource = roff.dbService.dbRepo.find(userRepo, "id", puttedUser.id);
						expect(deepEqual(repoResource, result), "put on client").to.be.true;
						pendingStatusCorrect(roff, result, "PUT", 0, ROOT_URI + userRepo + "/" + puttedUser.id, userRepo);

					});
				});
			});
		});
	});


	it("60: delete should, when online, handle a 404\
			(resource not found) by 'ignoring' them. \
			Should also ignore when persistanceDisabled is true", function() {
		var userRepo = "users44";

		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		return roff.clear(userRepo, true).then(function(result) {		
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

			return roff.delete(userRepo).then(function(result) {
				dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
				onlineStatusShouldEqual(roff, true, false, false, false);
				roff.persistanceDisabled = true;
				return roff.delete(userRepo).then(function(result) {
					roff.persistanceDisabled = false;
					dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
					onlineStatusShouldEqual(roff, true, false, false, false);
				});			
			}).catch(function(error) {
				console.log(error);
				expect(true, "Promise should call the then.").to.be.false;
			});
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
		return roff.clear(userRepo, true).then(function(result) {		
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);

			return roff.post(userRepo, userToDelete).then(function(result) {
				dbRepoShouldBeEqual(roff, userRepo, result, 1);
				return roff.delete(userRepo + "/" + userToDelete.id).then(function(result) {
					onlineStatusShouldEqual(roff, true, false, false, false);
					dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
				}).catch(function(error) {
					console.log(error);
					expect(true, "Promise should call the then.").to.be.false;
				});

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
		return roff.clear(userRepo, true).then(function(result) {		
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			return roff.delete("http://idontexisthopefully.com/users/001").then(function(idDeleted) {
				expect(true, "Promise should call the catch.", false);
			}).catch(function(error) {
				var errorExpected = {
					message: "Network Error",
					messageDetail: "",
					status: 0,
					uri: "http://idontexisthopefully.com/users/001"
				};
				expect(error, "Error result").to.deep.equals(errorExpected);
				onlineStatusShouldEqual(roff, false, false, true, false);
			});
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
			return roff.clear(userRepo, true).then(function(result) {
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			return roff.post(userRepo, userToDelete).then(function(getResults) {
				dbRepoShouldBeEqual(roff, userRepo, getResults, 1);
				roff.forcedOffline = true;
				onlineStatusShouldEqual(roff, false, false, true, true);
				return roff.delete(userRepo + "/" + userToDelete.id).then(function(getResults) {
					onlineStatusShouldEqual(roff, false, true, false, true);
					dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
					pendingStatusCorrect(roff, undefined, "DELETE", 0, ROOT_URI + userRepo + "/" + userToDelete.id, userRepo);
				});
			});
		});
	});

	it("65: delete should, when offline and persistanceDisabled,\
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
		return roff.clearAll(true).then(function(result) {
			pendingStatusCount(roff,0,"clear"); // should have no pending
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			roff.persistanceDisabled = true;
			return roff.delete(userRepo + "/" + userToDelete.id).then(function(getResults) {
				roff.persistanceDisabled = false;
				dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
				pendingStatusCount(roff,0,"delete"); // should have no pending
			});
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
		}

		var pendingRec2 = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd15",
			"restMethod" : "PUT",
			"uri" : "http://localhost/pending/"
		}


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
		}

		var pendingRec2 = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd15",
			"restMethod" : "PUT",
			"uri" : "http://localhost/pending/"
		}

		var pendingRec3 = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd14",
			"restMethod" : "GET",
			"uri" : "http://localhost/pending/"
		}

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

	// Reconciliation

	// Action              -  Server Only                | Client Only            | Both
	// A   Post Insert     -  1 DONE Get and Overwrite   | 2 Write to Server      | 3 Same primary key!!!
	// B   Post/Put Update -  1 DONE Get and Overwrite   | 2 Write to Server      | 3 Reconciliation
	// C   Delete          -  1 DONE Delete Local        | 2 Delete Remote        | 3 Nothing to do
	// D     Update           1 Updated ? Do What?       |   2 Updated ? Do What?

	it("70 A1, B1, C1: should reconcile when server has an\
	 			       put/insert/post/delete and client doesn't,\
	 			       server by overwriting value on client", function() {

		var user01 = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68511",
			"first_name": "Happy3",
			"last_name": "User3"
		};
		var user01Update = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68511",
			"first_name": "Happy3",
			"last_name": "Position"
		};

		var user02 = {
			"id": "4a30a4fb-b71e-4ef2-b430-d46f9af3f812",
			"first_name": "Existing",
			"last_name": "New Name"
		};

		var user02Post = {
			"id": "4a30a4fb-b71e-4ef2-b430-d46f9af3f812",
			"first_name": "Existing",
			"last_name": "Posted"
		};
	
		var user03Delete = {
			"id": "9783df16-0d70-4364-a1ee-3cb39818fd13",
			"first_name": "Joyous",
			"last_name": "WillDelete"
		};

		var user04New = {
			"id": "9783df16-0d70-4364-a1ee-3cb39818fd14",
			"first_name": "Joyous",
			"last_name": "And New"
		};


		var userRepo = "users15";
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		return roff.clear(userRepo, true).then(function(result) {		
			dbRepoShouldBeEqual(roff, userRepo, undefined, 0);
			return roff.post(userRepo, user01).then(function(result) {
				return roff.post(userRepo, user02).then(function(result) {
					return roff.post(userRepo, user03Delete).then(function(result) { 
						return roff.delete(userRepo + "/" + user04New.id).then(function(result) { // Above 4 rest test
							return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) { // verify posted to server
								expect(result, "db repo the same").to.be.true;
								roff.persistanceDisabled = true; // Make updates without making them locally
								return roff.put(userRepo + "/" + user01Update.id, user01Update).then(function(result) {
									return roff.post(userRepo, user02Post).then(function(result) {
										return roff.post(userRepo, user04New).then(function(result) {
											return roff.delete(userRepo + "/" + user03Delete.id).then(function(result) { // Above 4 rest test
												roff.persistanceDisabled = false;
												return dbRepoExactlyEqual(roff, userRepo, false).then(function(result) { // verify posted to server
													expect(result, "db repo the same").to.be.false;
													return roff.get(userRepo).then(function(result) {
														dbRepoShouldBeEqual(roff, userRepo, result, 3); // one was deleted one was added
														return dbRepoExactlyEqual(roff, userRepo, true).then(function(result) { // verify posted to server
															expect(result, "db repo the same").to.be.true;
															return roff.post(userRepo, user01).then(function(result) { // Return to prior dbState
																return roff.post(userRepo, user02).then(function(result) {
																	return roff.post(userRepo, user03Delete).then(function(result) { 
																		return roff.delete(userRepo + "/" + user04New.id).then(function(result) { // Above 4 restart test
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
	// 		onlineStatusShouldEqual(roff, false, false, true, false);			
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

	function pendingStatusCorrect(roff, resource, callAction, statusPosition, finalUri, repoName) {
		// README!: Only one status of each kind can be pending during a test
		var pendings = roff.dbService.dbRepo.read("pending");
		var status;
		pendings.forEach(function(item) {
			if (callAction === item.restMethod) {
				status = item;
			}
		})

		expect(pendings.length, "pending post").to.not.equal(0);
		expect(status.restMethod, "status restMethod").to.equal(callAction);
		expect(deepEqual(status.resources, resource), "status resource").to.equal(true);
		expect(status.clientTime, "status resource").to.be.an("date");
		expect(status.uri, "status uri").to.equal(finalUri)
		expect(status.repoName, "status repoName").to.equal(repoName)
	}

	function pendingStatusCount(roff, count, action) {
		var pendings = roff.dbService.dbRepo.read("pending");
		expect(pendings.length, "pending post").to.equal(count);
	}


	function onlineStatusShouldEqual(roff, online, offline, unknown, forced) {
		expect(roff.isStatusOnline, "isStatusOnline").to.equal(online);
		expect(roff.isStatusOffline, "isStatusOffline").to.equal(offline);
		expect(roff.isStatusUnknown, "isStatusUnknown").to.equal(unknown);
		expect(roff.forcedOffline, "forcedOffline ").to.equal(forced);
	}


	function dbRepoShouldBeEmptyAndResourceNotEmpty(roff, repoName, resource) {
		expect(roff.dbService.dbRepo.length(repoName), repoName + " db length").to.equal(0);
		expect(resource.length, repoName + " repo length").to.not.equal(0);
	}

	function dbRepoShouldBeEqual(roff, repoName, resource, len) {
		expect(roff.dbService.dbRepo.length(repoName), repoName + " repo and db length").to.equal(len);
		if (undefined !== resource)  {
			expect(dbResourceCompare(roff, repoName, resource, true), "db repo the same").to.be.true;
		}
	}

	function dbRepoExactlyEqual(roff, repoName, similarExpected) {

		var promise = new Promise(function(resolve, reject) {		
			// Verify client persisted database for repository is exactly equal
			// to the table/data in the servers database
			var roffDisabled = restlib.restoff({
				"rootUri" : ROOT_URI,			
				"persistanceDisabled" : true // Don't store the results anywhere
			});

			return roffDisabled.get(repoName).then(function(result) {
				// roff.persistanceDisabled = false; // to read db results
				resolve(dbResourceCompare(roff, repoName, result, similarExpected));
			});
		});
		return promise;
	}

	function dbResourceCompare(roff, repoName, resources, similarExpected) {
		var result = true;
		if (!(resources instanceof Array)) { // Make code easy: Always make it an array
			resources = [resources];
		}

		if (null === roff.dbService.dbRepo) {
			console.log("WARNING! persistanceDisabled is disabled. Please enable before comparing databases.");
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
			var primaryKey = resource[roff.primaryKeyName];
			var dbResource = roff.dbService.dbRepo.find(repoName, roff.primaryKeyName, primaryKey);

			if (false === deepEqual(resource, dbResource)) {
				if (similarExpected) {
					console.log("Mismatch between client and server database!!! Client %O and server %O", resource, dbResource);
				}
				result = false;
			}
		});
		return result;
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
