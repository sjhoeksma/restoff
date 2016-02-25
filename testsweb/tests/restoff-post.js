describe ("restoff post", function() {

	var ROOT_URI = "http://test.development.com:3000/";

	var newuser01 = {
		"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
		"first_name": "Happy3",
		"last_name": "User3"
	};

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

		expect(roff.repositorySize, "Repository size").to.equal(0);

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
		});
	});

	it("03: should, with a blank repo and when online,\
		    post a new item to server and local repository", function() {
		var userRepo = "users02";

		var roff = restoff({
			"rootUri" : ROOT_URI
		});
		expect(roff.repositorySize, "Repository size").to.equal(0);

		return roff.post(userRepo, newuser01).then(function(updatedResult) {
			expect(roff.repositorySize, "Repository size").to.equal(1);
			expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(updatedResult);
			var dbSource = restoff({
				"rootUri" : ROOT_URI
			});
			expect(dbSource.repositorySize, "Repository size").to.equal(0);

			return dbSource.get(userRepo).then(function(result) {
				expect(dbSource.repositorySize, "Repository size").to.equal(1);
				expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(result);
			});

		});
	});

	it("04: should, with a non-blank repo and when online, post a new item to server and local repository\
		and 404 (Not Found) for deletes should be ignored.", function() {
		var userRepo = "users04";

		var roff = restoff({
			"rootUri" : ROOT_URI
		});
		expect(roff.repositorySize, "Repository size").to.equal(0);

		// Clean up prior run just in case
		return roff.delete(userRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68577").then(function(result) {
			return roff.get(userRepo).then(function(sourceResult) {
				expect(roff.repositorySize, "Repository size").to.equal(1);
				expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(sourceResult);
				return roff.post(userRepo, newuser01).then(function(result) {
					expect(roff.repositorySize, "Repository size").to.equal(1);
					expect(roff.repositorySizeBy(userRepo), userRepo + " repository count").to.equal(2);
					expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(result);
					var dbSource = restoff({
						"rootUri" : ROOT_URI
					});
					expect(dbSource.repositorySize, "Repository size").to.equal(0);
					return dbSource.get(userRepo).then(function(result) {
						expect(dbSource.repositorySize, "Repository size").to.equal(1);
						expect(dbSource.repositorySizeBy(userRepo), userRepo + " repository count").to.equal(2);
						expect(dbSource.repositoryGet(userRepo), "Two repos should be the same").to.deep.equals(roff.repositoryGet(userRepo));
						return roff.delete(userRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68577"); // clean up
					});
				});
			});
		});
	});	

	it("05: should, when online and posting against an existing object, overwrite the existing one", function() {
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
		expect(roff.repositorySize, "Repository size").to.equal(0);

		// Clean up just in case
		return roff.post(userRepo, existingUser).then(function(result) {
			roff.clearCacheAll();
			expect(roff.repositorySize, "Repository size").to.equal(1);
			expect(roff.repositorySizeBy(userRepo), userRepo + "Repository size").to.equal(0);

			return roff.get(userRepo).then(function(result) {
				expect(roff.repositorySize, "Repository size").to.equal(1);
				expect(roff.repositorySizeBy(userRepo), userRepo + "Repository size").to.equal(1);
				expect(roff.repositoryGet(userRepo), userRepo + " repository equals").to.deep.equals(existingUsers);

				return roff.post(userRepo, editedUser).then(function(result) {
					expect(roff.repositorySize, "Repository size").to.equal(1);
					expect(roff.repositorySizeBy(userRepo), userRepo + "Repository size").to.equal(1);
					expect(roff.repositoryGet(userRepo), userRepo + " repository equals").to.deep.equals(editedUsers);

					return roff.post(userRepo, existingUser).then(function(result) {
						expect(roff.repositorySize, "Repository size").to.equal(1);
						expect(roff.repositorySizeBy(userRepo), userRepo + "Repository size").to.equal(1);
						expect(roff.repositoryGet(userRepo), userRepo + " repository equals").to.deep.equals(existingUsers);
						expect(result, userRepo + " repository equals").to.deep.equals(existingUsers);
						expect(roff.repositoryGet(userRepo), userRepo + " repository equals").to.deep.equals(result);
					});

				});
			});


		});

	});	

});


