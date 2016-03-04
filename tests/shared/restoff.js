// All tests are on the web
describe("restoffService", function() {
	it("01: should not wipeout Object prototype and be a roffService", function() {
		var roffService = restlib.restoffService();
		expect(roffService, "roffService").to.be.an("object");
	});

	it("02: should be a valid node module and require lowdb when running as a server", function() {
		if (typeof module !== 'undefined' && module.exports) { // Only on server
			var roffService = restlib.restoffService();
			expect(roffService.dbRepo, "roffService").to.be.an("object");
			expect(roffService.dbRepo._low, "roffService").to.be.an("function");
		}
	});

	it("03: post should, without a valid primary key,\
			reject the post. Service is configured correctly.", function() {
		var roffs = restlib.restoffService({
			primaryKeyName: "id3"
		});
		return roffs.write("users", {name:"User"}).catch(function(error) {
			expect(error, "correct error expected").to.deep.equals("Primary key 'id3' required for resource or the resource has an invalid primary key.");
		});

	});

	it("04: should have correct options.", function() {
		var roffs = restlib.restoffService();
		expect(roffs.primaryKeyName, "primaryKeyName").to.equal("id");
		roffs.primaryKeyName = "id2";
		expect(roffs.primaryKeyName, "primaryKeyName").to.equal("id2");

		var roffs2 = restlib.restoffService({
			primaryKeyName: "id3"
		});

		expect(roffs2.primaryKeyName, "primaryKeyName").to.equal("id3");

	});

	it("05: clear all resources to prepare tests\
			then post resources to different repositories\
		    then get one of those resource\
		    then delete one of those resources\
		    then clear out all resources.", function() {
		var roffs = restlib.restoffService();

		var user = {
			id : "8af8f277-77c9-4c6d-8819-9f97a3545596",
			first_name : "First",
			last_name : "User"
		};

		var user2 = {
			id : "8af8f277-77c9-4c6d-8819-9f97a3545597",
			first_name : "Second",
			last_name : "User"
		};

		var user3 = {
			id : "8af8f277-77c9-4c6d-8819-9f97a3545598",
			first_name : "Third",
			last_name : "User"
		};

		var users = [user2, user3];

		var address = {
			id : "8af8f277-77c9-4c6d-8819-9f97a3545522"
		}

		return roffs.clearAll().then(function() {
			return roffs.write("users", user).then(function(result) {
				expect([user], "result should equal user").to.deep.equals(result);
				return roffs.write("addresses", address).then(function(result) {
					expect([address], "result should equal address").to.deep.equals(result);
					return roffs.write("users", users).then(function(result) {
						expect(users, "result should equal users").to.deep.equals(result);
						return roffs.find("users").then(function(result) {
							expect([user, user2, user3], "result should equal users").to.deep.equals(result);
							return roffs.delete("users", "8af8f277-77c9-4c6d-8819-9f97a3545598").then(function(deletedId) {
								expect(deletedId, "correct deleted id").to.equal("8af8f277-77c9-4c6d-8819-9f97a3545598");
								return roffs.find("users").then(function(result) {
									expect([user, user2], "result should have one less user").to.deep.equals(result);
									return roffs.clear("users").then(function() {
										return roffs.find("users").then(function(result) {
											expect([], "result should have one less user").to.deep.equals(result); // nothing left in users
											return roffs.clearAll().then(function() {
												return roffs.find("addresses").then(function(result) {
													expect([], "result should have no addresses").to.deep.equals(result); // nothing left
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

	it("06: should use correct configured primarykey.", function() {
		var roffs = restlib.restoffService({
			primaryKeyName: "id2"
		});

		var user = {
			id2 : "8af8f277-77c9-4c6d-8819-9f97a3545596",
			first_name : "First",
			last_name : "User"
		};

		var user2 = {
			id2 : "8af8f277-77c9-4c6d-8819-9f97a3545597",
			first_name : "Second",
			last_name : "User"
		};

		var user3 = {
			id2 : "8af8f277-77c9-4c6d-8819-9f97a3545598",
			first_name : "Third",
			last_name : "User"
		};

		var users = [user2, user3];

		var address = {
			id2 : "8af8f277-77c9-4c6d-8819-9f97a3545522"
		}

		return roffs.clearAll().then(function() {
			return roffs.write("users", user).then(function(result) {
				return roffs.write("addresses", address).then(function(result) {
					return roffs.write("users", users).then(function(result) {
						return roffs.find("users").then(function(result) {
							return roffs.delete("users", "8af8f277-77c9-4c6d-8819-9f97a3545598").then(function(deletedId) {
								return roffs.find("users").then(function(result) {
									return roffs.clear("users").then(function() {
										return roffs.find("users").then(function(result) {
											return roffs.clearAll().then(function() {
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

	it("07: should support custom primary key names.", function() {
		var roffs = restlib.restoffService();
		var address = {
			guid : "8af8f277-77c9-4c6d-8819-9f97a3545522",
			line : "114 Happy Drive"
		}

		var addressUpdated = {
			guid : "8af8f277-77c9-4c6d-8819-9f97a3545522",
			line : "114 Happy Drive2"
		}

		return roffs.clearAll().then(function() {
			return roffs.write("addresses", address, {primaryKeyName:"guid"}).then(function(result) {
				return roffs.write("addresses", addressUpdated, {primaryKeyName:"guid"}).then(function(result) {
					return roffs.find("addresses").then(function(result) {
						expect([addressUpdated], "result should equal address").to.deep.equals(result);
						return roffs.delete("addresses", "8af8f277-77c9-4c6d-8819-9f97a3545522", {primaryKeyName:"guid"}).then(function(deletedId) {
							return roffs.find("addresses", {primaryKeyName:"guid"}).then(function(result) {
								expect(result, "addresses should be empty").to.deep.equals([]);
							});
						});
					});
				});
			});
		});
	});

	it("08: should error when invalid custom primary key names is provided.", function() {
		var roffs = restlib.restoffService();
		var address = {
			guid : "8af8f277-77c9-4c6d-8819-9f97a3545522",
			line : "114 Happy Drive"
		};

		return roffs.write("addresses", address, {primaryKeyName: "nope"}).catch(function(error) {
			expect(error, "correct error expected").to.deep.equals("Primary key 'nope' required for resource or the resource has an invalid primary key.");
		});
	});

	it("09: should support configuration of repositories\
		and use the configurations and configuration should\
		have preference of call specific, then repo specific, then Service specific.", function() {

		var usersRepoOpt = {
			repoName: "users",
			primaryKeyName: "id2"
		};

		var addressesRepoOpt = {
			repoName: "addresses",
			primaryKeyName: "id2"
		};

		var roffs = restlib.restoffService({
			primaryKeyName: "guid",
			repoOptions: [ usersRepoOpt, addressesRepoOpt]
		});

		expect(roffs.repoOptionsGet("users"), "correct user repo").to.deep.equals(usersRepoOpt);
		expect(roffs.repoOptionsGet("addresses"), "correct address repo").to.deep.equals(addressesRepoOpt);

		var addressesRepoOptNew = {
			repoName: "addresses",
			primaryKeyName: "guid"
		};

		var emailRepoOpt = {
			repoName: "emailaddresses",
			primaryKeyName: "id3"
		}

		expect(roffs.repoOptionsSet(emailRepoOpt), "method chaining works").to.equals(roffs);
		expect(roffs.repoOptionsGet("emailaddresses"), "correct emailaddress repo").to.deep.equals(emailRepoOpt);

		roffs.repoOptionsSet(addressesRepoOptNew);
		expect(roffs.options.repoOptions.length, "correct length").to.equals(3);
		expect(roffs.repoOptionsGet("addresses"), "address repo replaced").to.deep.equals(addressesRepoOptNew);

		var address = {
			guid : "8af8f277-77c9-4c6d-8819-9f97a3545522",
			line : "114 Happy Drive"
		}

		var addressUpdated = {
			guid : "8af8f277-77c9-4c6d-8819-9f97a3545522",
			line : "114 Happy Drive2"
		}

		return roffs.clearAll().then(function() {
			return roffs.write("addresses", address).then(function(result) {
				return roffs.write("addresses", addressUpdated).then(function(result) {
					return roffs.find("addresses").then(function(result) {
						expect([addressUpdated], "result should equal address").to.deep.equals(result);
						return roffs.delete("addresses", "8af8f277-77c9-4c6d-8819-9f97a3545522").then(function(deletedId) {
							return roffs.find("addresses").then(function(result) {
								expect(result, "addresses should be empty").to.deep.equals([]);
							});
						});
					});
				});
			});
		});
	});

	it("10: should find items in the repository.", function() {
		var roffs = restlib.restoffService();

		var user01 = {
			id: "99fcc513-be45-48cd-99cf-c48320775bc2",
			first_name: "Happy",
			last_name: "First",
			sex: "Male"
		};

		var user02 = {
			id: "99fcc513-be45-48cd-99cf-c48320775bc3",
			first_name: "Happy",
			last_name: "Second",
			sex: "Male"
		};

		var user03 = {
			id: "99fcc513-be45-48cd-99cf-c48320775bc4",
			first_name: "Happy",
			last_name: "Third",
			sex: "Female"
		};

		var users = [user01, user02, user03]

		return roffs.clearAll().then(function() {
			return roffs.write("users", users).then(function(result) {
				return roffs.find("users", {sex:"Female"}).then(function(result) {
					expect([user03], "should find correct records").to.deep.equals(result);
					return roffs.deleteQuery("users", {sex:"Male"}).then(function() {
						return roffs.find("users").then(function(result) {
							expect([user03], "should find correct records").to.deep.equals(result);
						});
					});
				});
			});
		});
	});

});