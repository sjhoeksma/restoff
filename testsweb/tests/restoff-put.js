describe ("restoff put", function() {

	var ROOT_URI = "http://test.development.com:3000/";

	var existingUser01 = {
		"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
		"first_name": "Happy3",
		"last_name": "User3"
	};

	it("01: should, when online, handle network errors", function() {
		return restoff().put("http://idontexisthopefully.com", existingUser01).then(function(result) {
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

	it("02: should, when online, handle 404 not found when the primary key\
	        is not part of the URI ", function() {
		var userRepo = "users44";

		var roff = restoff({
			"rootUri" : ROOT_URI
		});
		expect(roff.repositorySize, "Repository size").to.equal(0);

		return roff.put(userRepo, existingUser01).then(function(result) {
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
		    put an existing resource on the server and local repository", function() {
		var userRepo = "users07";

		var roff = restoff({
			"rootUri" : ROOT_URI
		});
		expect(roff.repositorySize, "Repository size").to.equal(0);

		var puttedUser = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
			"first_name": "Happy3",
			"last_name": "putted"
		};

		// Assure test data is in the database
		return roff.put(userRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68577", existingUser01).then(function(updatedResult1) {
			expect(roff.repositorySize, "Repository size").to.equal(1);
			expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(updatedResult1);
			roff.clearCacheAll();
			expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals([]);

			return roff.put(userRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68577", puttedUser).then(function(updatedResult) {
				expect(roff.repositorySize, "Repository size").to.equal(1);
				expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(updatedResult);
				var dbSource = restoff({
					"rootUri" : ROOT_URI
				});
				expect(dbSource.repositorySize, "Repository size").to.equal(0);

				return dbSource.get(userRepo).then(function(result) {
					expect(dbSource.repositorySize, "Repository size").to.equal(1);
					expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(result);

					// Reset test with original data
					return roff.put(userRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68577", existingUser01);
				});

			});
		});
	});

	it("04: should, with a non-blank repo and when online,\
		NOT put a new resource to server and local repository.", function() {
		// Put does not add a new resource if one doesn't exist. You get a 404 for the URI
		// Just have this here so it is documented
	});	

});