describe ("restoff delete", function() {

	function testUri(path) {
		return "http://test.development.com:3000/" + path;
	}

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
		var testid = "44";
		var userRepo = "users" + testid;

		var roff = restoff();
		expect(roff.repositorySize, "Repository size").to.equal(0);
		return roff.delete(testUri(userRepo+"/232")).then(function(result) {
			expect(roff.repositorySize, "Repository size").to.equal(1);
			expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals([]);
		}).catch(function(error) {
			expect(true, "Promise should call the then.").to.be.false;
		});
	});

	it("03: should, with a blank repo and when online, do nothing because we can't delete something we don't have they key of", function() {
	});

	it("04: should, with a non-blank repo and when online, delete an existing item from the server and local repository", function() {
		var testid = "06";
		var userRepo = "users" + testid;
		var roff = restoff();

		expect(roff.repositorySize, "Repository length").to.equal(0);

		var userToDelete = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68522",
			"first_name": "Unhappy",
			"last_name": "User"
		};

		var usersToDelete = [];
		usersToDelete["aedfa7a4-d748-11e5-b5d2-0a1d41d68522"] = userToDelete;

		expect(roff.repositorySize, "Repository length").to.equal(0);
		return roff.post(testUri(userRepo), userToDelete).then(function(result) {
			expect(roff.repositorySize, "Repository length").to.equal(1);
			expect(roff.repositoryGet(userRepo)["aedfa7a4-d748-11e5-b5d2-0a1d41d68522"], userRepo + " repository count ").to.deep.equals(userToDelete);
			expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(usersToDelete);

			return roff.delete(testUri(userRepo + "/aedfa7a4-d748-11e5-b5d2-0a1d41d68522")).then(function(result) {
				expect(roff.repositorySize, "Repository length").to.equal(1);
				expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals([]);
			}).catch(function(error) {
				console.log(error);
				expect(true, "Promise should call the then.").to.be.false;
			});

		});

	});

});