

describe ("restoffSynchronous", function() {

  // This feature has been removed.
	// it("01: getRepo, deleteRepo, putRepo, postRepo should not work in forcedOffline mode or clientOnly is true.", function() {
	// 	var roff = restlib.restoff({ "rootUri" : ROOT_URI });
	// 	var repository = "users11";
	// 	roff.clear(repository, true);
	// 	return Promise.all([
	// 		roff.get(repository)
	// 	]).then(function() {
	// 		expect(function() {
	// 				roff.getRepo(repository);
	// 		},"should throw exception").to.throw("getRepo only available when forcedOffline or clientOnly is true.");
	// 		expect(function() {
	// 				roff.deleteRepo(repository);
	// 		},"should throw exception").to.throw("deleteRepo only available when forcedOffline or clientOnly is true.");
	// 		expect(function() {
	// 				roff.postRepo(repository);
	// 		},"should throw exception").to.throw("postRepo only available when forcedOffline or clientOnly is true.");
	// 		expect(function() {
	// 				roff.putRepo(repository);
	// 		},"should throw exception").to.throw("putRepo only available when forcedOffline or clientOnly is true.");
	//
	// 		expect(function() {
	// 				roff.getRepo(repository, {clientOnly: false});
	// 		},"should throw exception").to.throw("getRepo only available when forcedOffline or clientOnly is true.");
	// 		expect(function() {
	// 				roff.deleteRepo(repository, {clientOnly: false});
	// 		},"should throw exception").to.throw("deleteRepo only available when forcedOffline or clientOnly is true.");
	// 		expect(function() {
	// 				roff.postRepo(repository, undefined, {clientOnly: false});
	// 		},"should throw exception").to.throw("postRepo only available when forcedOffline or clientOnly is true.");
	// 		expect(function() {
	// 				roff.putRepo(repository, undefined, {clientOnly: false});
	// 		},"should throw exception").to.throw("putRepo only available when forcedOffline or clientOnly is true.");
	//
	// 		roff.forcedOffline = true;
	// 		expect(function() {
	// 				roff.getRepo(repository);
	// 		},"should throw exception").to.not.
	// 		throw("getRepo only available when forcedOffline or clientOnly is true.");
	// 		expect(function() {
	// 				roff.deleteRepo(repository);
	// 		},"should throw exception").to.not.throw("deleteRepo only available when forcedOffline or clientOnly is true.");
	// 		expect(function() {
	// 				roff.postRepo(repository);
	// 		},"should throw exception").to.not.throw("postRepo only available when forcedOffline or clientOnly is true.");
	// 		expect(function() {
	// 				roff.putRepo(repository);
	// 		},"should throw exception").to.not.throw("putRepo only available when forcedOffline or clientOnly is true.");
	//
	// 		roff.forcedOffline = false;
	//
	// 		expect(function() {
	// 				roff.getRepo(repository, {clientOnly: true});
	// 		},"should throw exception").to.not.throw("getRepo only available when forcedOffline or clientOnly is true.");
	// 		expect(function() {
	// 				roff.deleteRepo(repository, {clientOnly: true});
	// 		},"should throw exception").to.not.throw("deleteRepo only available when forcedOffline or clientOnly is true.");
	// 		expect(function() {
	// 				roff.postRepo(repository, undefined, {clientOnly: true});
	// 		},"should throw exception").to.not.throw("postRepo only available when forcedOffline or clientOnly is true.");
	// 		expect(function() {
	// 				roff.putRepo(repository, undefined, {clientOnly: true});
	// 		},"should throw exception").to.not.throw("putRepo only available when forcedOffline or clientOnly is true.");
	//
	// 	});
	// });

	it("02: getRepo should return results when offlineOnly or options is clientOnly.", function() {
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		var repository = "users11";

		var users11 = [
	    {
	      "ID": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
	      "first_name": "Happy3",
	      "last_name": "User3",
	      "id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577"
	    },
	    {
	      "ID": "4a30a4fb-b71e-4ef2-b430-d46f9af3f8fa",
	      "first_name": "Existing",
	      "last_name": "New Name",
	      "id": "4a30a4fb-b71e-4ef2-b430-d46f9af3f8fa"
	    },
	    {
	      "ID": "9783df16-0d70-4364-a1ee-3cb39818fd59",
	      "first_name": "Joyous",
	      "last_name": "Person",
	      "id": "9783df16-0d70-4364-a1ee-3cb39818fd59"
	    }
	  ];

		roff.clear(repository, true);
		return Promise.all([
			roff.get(repository)
		]).then(function() {
				roff.forcedOffline = true;
				var result = roff.getRepo(repository);
				expect(deepEqualOrderUnimportant(users11, result, "id"), "should immediately return").to.equal(true);
		});

	});

	it("03: post should add to pending and return results when offlineOnly or options is clientOnly.", function() {
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		var repository = "users22";

		var postRec = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd13",
			"restMethod" : "PUT",
			"uri" : "http://localhost/pending/"
		};

		var postRec2 = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd16",
			"restMethod" : "PUT",
			"uri" : "http://localhost/pending/"
		};

		var putRec = {
			"id": "9783df16-0d70-4362-a1ee-3cb39818fd13",
			"restMethod" : "PUT",
			"uri" : "http://localhost/pending/putted"
		};

		roff.clear(repository, true);
		roff.forcedOffline = true;
		onlineStatusShouldEqual(roff, true);

		expect(function() {
			roff.putRepo(repository+"/"+"notinrepopk", putRec);
		},"should throw exception when put called on a resource that doesn't exist").to.throw();

		var result = roff.postRepo(repository, postRec);
		expect(result, "should immediately return with correct posted value").to.deep.equals(postRec);

		var result2 = roff.getRepo(repository);
		expect(result2, "expected the posted record").to.deep.equals([postRec]);


		var result3 = roff.postRepo(repository, postRec2);
		expect(result3, "should immediately return with correct posted value").to.deep.equals(postRec2);
		var result4 = roff.getRepo(repository);
		expect(result4, "expected the posted record").to.deep.equals([postRec, postRec2]);
		var result5 = roff.putRepo(repository+"/"+putRec.id, putRec);
		expect(result5, "expected the putted record").to.deep.equals(putRec);

		var result6 = roff.deleteRepo(repository+"/"+postRec2.id);
		expect(result6,"delete should return primary key").to.equal(postRec2.id);

		var pending = pendingResourcesGetNp(roff, repository);
		expect(pending.length, "should have pending records").to.equal(2);
	});

	it("04: should thrown an exception when an invalid rest method is called", function() {
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		roff.forcedOffline = true;
		expect(function() {
			roff.restCallSync("users", "INVALID");
		},"should throw exception").to.throw("Rest method 'INVALID' not currently supported or is invalid.");

	});


});
