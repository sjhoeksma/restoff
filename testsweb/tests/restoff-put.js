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

	it("02: should, when online, handle 404's'", function() {
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
});