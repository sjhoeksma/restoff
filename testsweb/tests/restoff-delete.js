describe ("restoff delete", function() {

	function testUri(path) {
		return "http://test.development.com:3000/" + path;
	}

	// it("should do a physical delete on an endpoint and the local repository while online", function() {

	// 	var testid = "02"; // 06
	// 	var userRepo = "users" + testid;

	// 	expect(Object.keys(rofftest.repository).length, "Repository length").to.equal(0);
	// 	var roff = restoff();

	// 	var newuser = {
	// 		"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68577",
	// 		"first_name": "Happy2",
	// 		"last_name": "User2"
	// 	}

	// 	return roff.post(testUri(userRepo), newuser).then(function(result) {



	// 	});

	// 	// return roff.delete(testUri("users/71ea1a7b-eed2-4c8b-9a6a-10900e8cbbe4"))
	// 	// .then(function(users_source) {
	// 	// 	// expect(roff.repository["users"].length, "User repository count ").to.equal(0);
	// 	// 	// expect(roff.repository["users"], "User object").to.deep.equals(users_source);

	// 	// });


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