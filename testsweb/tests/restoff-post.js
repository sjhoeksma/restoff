describe ("restoff post", function() {

	function testUri(path) {
		return "http://test.development.com:3000/" + path;
	}

	it("01: should post a new item to the endpoint and local repository\
	    when online even when the repository has not been created yet", function() {

		var testid = "02"; // 06
		var userRepo = "users" + testid;

		var roff = restoff();
		expect(Object.keys(roff.repository).length, "Repository length").to.equal(0);

		var newuser = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
			"first_name": "Happy2",
			"last_name": "User2"
		}

		return roff.post(testUri(userRepo), newuser).then(function(result) {
			// expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);
			// console.log(roff.repository[userRepo]);
			// console.log(roff.repository[userRepo].length);
			// expect(roff.repository[userRepo].length, userRepo + " repository count").to.equal(1);
			// var dbSource = restoff();
			// expect(Object.keys(dbSource.repository).length, "Repository length").to.equal(0);
			// return dbSource.get(testUri(userRepo)).then(function(result) {
			// 	expect(Object.keys(dbSource.repository).length, "Repository length").to.equal(1);
			// 	expect(dbSource.repository[userRepo].length, userRepo + " repository count").to.equal(1);
			// });

		});

		// return roff.get(testUri(userRepo)).then(function(result) {
		// 	expect(Object.keys(rofftest.repository).length, "Repository length").to.equal(0);



		// });

		// return roff.delete(testUri("users/71ea1a7b-eed2-4c8b-9a6a-10900e8cbbe4"))
		// .then(function(users_source) {
		// 	// expect(roff.repository["users"].length, "User repository count ").to.equal(0);
		// 	// expect(roff.repository["users"], "User object").to.deep.equals(users_source);

		// });


		// return roff.get(testUri("users"))
		// 	.then(function(users) {
		// 		expect(roff.repository["users"], "User object").to.deep.equals(users);
		// 		expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);

		// 		return roff.post(testUri("users"), 
 	// 				{
		// 		    	"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
		// 		    	"first_name": "Happy2",
		// 		    	"last_name": "User2"
		// 		    }
		// 		)
		// 		.then(function(result) {
		// 			console.log(result);
		// 		});

		// });


	});

	// var rofftest;

	// function testUri(path) {
	// 	return "http://test.development.com:3000/" + path;
	// }

	// beforeEach(function() {
	// 	// This is our "always online" datasource that we
	// 	// reset between each test.
	// 	rofftest = restoff();
	// 	rofftest.clearCacheAll();
	// });	

	// it("should add a new object correctly when online and repository was loaded", function() {
	// 	expect(Object.keys(rofftest.repository).length, "Repository length").to.equal(0);
	// 	var roff = restoff();

	// 	return roff.get(testUri("users"))
	// 	.then(function(users_source) {
	// 		expect(roff.repository["users"].length, "User repository count ").to.equal(1);
	// 		// expect(roff.repository["users"], "User object").to.deep.equals(users_source);

	// 	});


	// 	// return roff.get(testUri("users"))
	// 	// 	.then(function(users) {
	// 	// 		expect(roff.repository["users"], "User object").to.deep.equals(users);
	// 	// 		expect(Object.keys(roff.repository).length, "Repository length").to.equal(1);

	// 	// 		return roff.post(testUri("users"), 
 // 	// 				{
	// 	// 		    	"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
	// 	// 		    	"first_name": "Happy2",
	// 	// 		    	"last_name": "User2"
	// 	// 		    }
	// 	// 		)
	// 	// 		.then(function(result) {
	// 	// 			console.log(result);
	// 	// 		});

	// 	// });


	// });



});