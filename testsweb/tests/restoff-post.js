describe ("restoff post", function() {

	var newuser01 = {
		"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
		"first_name": "Happy3",
		"last_name": "User3"
	};

	var newuser02 = {
		"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68576",
		"first_name": "Happy4",
		"last_name": "User4"
	};

	function testUri(path) {
		return "http://test.development.com:3000/" + path;
	}

	it("01: should, with a blank repo and when online, post a new item to server and local repository", function() {

		var testid = "02";
		var userRepo = "users" + testid;

		var roff = restoff();
		expect(Object.keys(roff.repository).length, "Repository length").to.equal(0);


		return roff.post(testUri(userRepo), newuser01).then(function(result) {
			expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
			expect(roff.repository[userRepo].length, userRepo + " repository count").to.equal(1);
			var dbSource = restoff();
			expect(Object.keys(dbSource.repository).length, "Repository length").to.equal(0);
			return dbSource.get(testUri(userRepo)).then(function(result) {
				expect(Object.keys(dbSource.repository).length, "Repository length").to.equal(1);
				expect(dbSource.repository[userRepo].length, userRepo + " repository count").to.equal(1);
			});

		});
	});

	it("02: should, when online, handle network errors", function() {
		return restoff().post("http://idontexisthopefully.com", newuser01).then(function(result) {
			expect(true, "Promise should call the catch.", false);
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

	it("03: should, when online, handle 404's'", function() {

		var testid = "44";
		var userRepo = "users" + testid;

		var roff = restoff();
		expect(Object.keys(roff.repository).length, "Repository length").to.equal(0);

		return roff.post(testUri(userRepo), newuser01).then(function(result) {
			expect(true, "Promise should call the catch.", false);
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

	it("04: should, with a non-blank repo and when online, post a new item to server and local repository", function() {

		var testid = "04";
		var userRepo = "users" + testid;

		var roff = restoff();
		expect(Object.keys(roff.repository).length, "Repository length").to.equal(0);

		// Clean up prior run just in case
		return roff.delete(testUri(userRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68577")).then(function(result) {
			return roff.get(testUri(userRepo)).then(function(result) {
				expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
				var roffRepo = roff.repository[userRepo];
				expect(roffRepo.length, userRepo + " repository count").to.equal(1);
				return roff.post(testUri(userRepo), newuser01).then(function(result) {
					expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
					expect(roffRepo.length, userRepo + " repository count").to.equal(2);
					var dbSource = restoff();
					expect(Object.keys(dbSource.repository).length, "Repository length").to.equal(0);
					return dbSource.get(testUri(userRepo)).then(function(result) {
						var dbSourceRepo = dbSource.repository[userRepo];
						expect(Object.keys(dbSource.repository).length, "Repository length").to.equal(1);
						expect(dbSourceRepo.length, userRepo + " repository count").to.equal(2);
						expect(dbSource.repository[userRepo], "Two repos should be the same").to.deep.equals(roff.repository[userRepo]);
						return roff.delete(testUri(userRepo+"/aedfa7a4-d748-11e5-b5d2-0a1d41d68577")); // clean up
					});
				});
			});
		});
	});	

	// TODO: Post offline logic including merging.

});


