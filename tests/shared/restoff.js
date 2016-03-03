// All tests are on the web
describe("restoffService", function() {
	it("01: should not wipeout Object prototype and be a restoff", function() {
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

	it("03: add resources to different repositories\
		    then get one of those resource\
		    then delete one of those resources\
		    then clear out all resources.", function() {
		if (typeof module !== 'undefined' && module.exports) { // Only on server
			var roffService = restlib.restoffService();

			var user = {
				id : "8af8f277-77c9-4c6d-8819-9f97a3545596",
				first_name : "First",
				last_name : "User"
			};

			var address = {
				id : "8af8f277-77c9-4c6d-8819-9f97a3545522"
			}

			// return roffService.delete().then(function(deletedId) {
			// 	expect(deletedId, "no id because everything deleted").to.be.undefined;





			// }); // clear everything



			// roffService.deleteFromRepo("users");


			// roffService.addRepo("users", user);
			// var usersFound = roffService.getRepo("users", "8af8f277-77c9-4c6d-8819-9f97a3545596");
			// expect(usersFound[0], "should get what was posted").to.deep.equals(user);



		}

	});
});