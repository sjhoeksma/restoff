describe ("restoff delete", function() {

	var ROOT_URI = "http://test.development.com:3000/";

	it("01: should, when online, handle network errors", function() {
		return restoff().delete("http://idontexisthopefully.com/001").then(function(result) {
			expect(true, "Promise should call the catch.", false);
		}).catch(function(error) {
			var errorExpected = {
				message: "Network Error",
				messageDetail: "",
				status: 0,
				uri: "http://idontexisthopefully.com/001"
			};
			expect(error, "Error result").to.deep.equals(errorExpected);
		});
	});

	it("02: should, when online, ignore 404s", function() {
		var userRepo = "users44";

		var roff = restoff({
			"rootUri" : ROOT_URI
		});
		expect(roff.repositorySize, "Repository size").to.equal(0);
		return roff.delete(userRepo + "/232").then(function(result) {
			expect(roff.repositorySize, "Repository size").to.equal(1);
			expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals([]);
		}).catch(function(error) {
			console.log(error);
			expect(true, "Promise should call the then.").to.be.false;
		});
	});

	it("03: should, with a blank repo and when online,\
	        do nothing because we can't delete something\
	        we don't have they key of", function() {
	});

	it("04: should, with a non-blank repo and when online,\
	        delete an existing item from the server and local\
	        repository", function() {
		var userRepo = "users06";
		var roff = restoff({
			"rootUri" : ROOT_URI
		});
		var userToDelete = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68522",
			"first_name": "Unhappy",
			"last_name": "User"
		};
		var usersToDelete = [];
		usersToDelete["aedfa7a4-d748-11e5-b5d2-0a1d41d68522"] = userToDelete;

		expect(roff.repositorySize, "Repository size").to.equal(0);
		return roff.post(userRepo, userToDelete).then(function(result) {
			expect(roff.repositorySize, "Repository size").to.equal(1);
			expect(roff.repositoryGet(userRepo)["aedfa7a4-d748-11e5-b5d2-0a1d41d68522"], userRepo + " repository").to.deep.equals(userToDelete);
			expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(usersToDelete);

			return roff.delete(userRepo + "/aedfa7a4-d748-11e5-b5d2-0a1d41d68522").then(function(result) {
				expect(roff.repositorySize, "Repository size").to.equal(1);
				expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals([]);
			}).catch(function(error) {
				console.log(error);
				expect(true, "Promise should call the then.").to.be.false;
			});

		});

	});

});