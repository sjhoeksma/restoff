describe ("restoff delete", function() {

	var rofftest;

	function testUri(path) {
		return "http://test.development.com:3000/" + path;
	}

	beforeEach(function() {
		// This is our "always online" datasource that we
		// reset between each test.
		rofftest = restoff();
		rofftest.clearCacheAll();
	});	

	it("should delete a record at an endpoint", function() {
		expect(Object.keys(rofftest.repository).length, "Repository length").to.equal(0);
		var roff = restoff();

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



});