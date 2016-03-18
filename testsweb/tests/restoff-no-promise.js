

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

});
