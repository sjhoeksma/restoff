

describe ("restoffNoPromise", function() {

	it("01: getNp, deleteNp, putNp, postNp should not work in forcedOffline mode or clientOnly is true.", function() {
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		var repository = "users11";
		return Promise.all([
			roff.clear(repository, true),
			roff.get(repository)
		]).then(function() {
			expect(function() {
					roff.getNp(repository);
			},"should throw exception").to.throw("getNp only available when forcedOffline or clientOnly is true.");
			expect(function() {
					roff.deleteNp(repository);
			},"should throw exception").to.throw("deleteNp only available when forcedOffline or clientOnly is true.");
			expect(function() {
					roff.postNp(repository);
			},"should throw exception").to.throw("postNp only available when forcedOffline or clientOnly is true.");
			expect(function() {
					roff.putNp(repository);
			},"should throw exception").to.throw("putNp only available when forcedOffline or clientOnly is true.");

			expect(function() {
					roff.getNp(repository, {clientOnly: false});
			},"should throw exception").to.throw("getNp only available when forcedOffline or clientOnly is true.");
			expect(function() {
					roff.deleteNp(repository, {clientOnly: false});
			},"should throw exception").to.throw("deleteNp only available when forcedOffline or clientOnly is true.");
			expect(function() {
					roff.postNp(repository, undefined, {clientOnly: false});
			},"should throw exception").to.throw("postNp only available when forcedOffline or clientOnly is true.");
			expect(function() {
					roff.putNp(repository, undefined, {clientOnly: false});
			},"should throw exception").to.throw("putNp only available when forcedOffline or clientOnly is true.");

			roff.forcedOffline = true;
			expect(function() {
					roff.getNp(repository);
			},"should throw exception").to.not.throw("getNp only available when forcedOffline or clientOnly is true.");
			expect(function() {
					roff.deleteNp(repository);
			},"should throw exception").to.not.throw("deleteNp only available when forcedOffline or clientOnly is true.");
			expect(function() {
					roff.postNp(repository);
			},"should throw exception").to.not.throw("postNp only available when forcedOffline or clientOnly is true.");
			expect(function() {
					roff.putNp(repository);
			},"should throw exception").to.not.throw("putNp only available when forcedOffline or clientOnly is true.");

			roff.forcedOffline = false;

			expect(function() {
					roff.getNp(repository, {clientOnly: true});
			},"should throw exception").to.not.throw("getNp only available when forcedOffline or clientOnly is true.");
			expect(function() {
					roff.deleteNp(repository, {clientOnly: true});
			},"should throw exception").to.not.throw("deleteNp only available when forcedOffline or clientOnly is true.");
			expect(function() {
					roff.postNp(repository, undefined, {clientOnly: true});
			},"should throw exception").to.not.throw("postNp only available when forcedOffline or clientOnly is true.");
			expect(function() {
					roff.putNp(repository, undefined, {clientOnly: true});
			},"should throw exception").to.not.throw("putNp only available when forcedOffline or clientOnly is true.");

		});
	});

	it("02: getNp should return results when offlineOnly or options is clientOnly.", function() {
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

		return Promise.all([
			roff.clear(repository, true),
			roff.get(repository)
		]).then(function() {
				roff.forcedOffline = true;
				var result = roff.getNp(repository);
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


		return Promise.all([
			roff.clear(repository, true),
		]).then(function() {
			roff.forcedOffline = true;
			onlineStatusShouldEqual(roff, false, false, true, true); // (roff, online, offline, unknown, forced)

			expect(function() {
				roff.putNp(repository+"/"+"notinrepopk", putRec);
			},"should throw exception when put called on a resource that doesn't exist").to.throw();

			onlineStatusShouldEqual(roff, false, false, true, true); // (roff, online, offline, unknown, forced)

			var result = roff.postNp(repository, postRec);
			expect(result, "should immediately return with correct posted value").to.deep.equals(postRec);
			onlineStatusShouldEqual(roff, false, false, true, true); // (roff, online, offline, unknown, forced)

			var result2 = roff.getNp(repository);
			expect(result2, "expected the posted record").to.deep.equals([postRec]);
			onlineStatusShouldEqual(roff, false, false, true, true); // (roff, online, offline, unknown, forced)


			var result3 = roff.postNp(repository, postRec2);
			expect(result3, "should immediately return with correct posted value").to.deep.equals(postRec2);
			var result4 = roff.getNp(repository);
			expect(result4, "expected the posted record").to.deep.equals([postRec, postRec2]);
			var result5 = roff.putNp(repository+"/"+putRec.id, putRec);
			expect(result5, "expected the putted record").to.deep.equals(putRec);
			onlineStatusShouldEqual(roff, false, false, true, true); // (roff, online, offline, unknown, forced)

			var result6 = roff.deleteNp(repository+"/"+postRec2.id);
			expect(result6,"delete should return primary key").to.equal(postRec2.id);
			onlineStatusShouldEqual(roff, false, false, true, true); // (roff, online, offline, unknown, forced)

			var pending = pendingResourcesGetNp(roff, repository);
			expect(pending.length, "should have pending records").to.equal(4);

		});

	});

	it("04: should thrown an exception when an invalid rest method is called", function() {
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		roff.forcedOffline = true;
		expect(function() {
			roff.restCallNp("users", "INVALID");
		},"should throw exception").to.throw("Rest method 'INVALID' not currently supported or is invalid.");

	});


});
