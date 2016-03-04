describe ("lowdbRepo", function() {

	var ROOT_URI = "http://test.development.com:3000/";

	function testLog(text) {
		if (false) {
			console.log(text);
		}
	}

	it("01: should not wipeout Object prototype and be a restoff", function() {
		var repo = restlib.lowdbRepo();
		expect(restlib.lowdbRepo, "restoff").to.be.an("function");
		expect(repo, "restoff").to.be.an("object");
	});

	it("02: should handle config settings correctly", function() {
		var repo = restlib.lowdbRepo();
		expect(repo.dbName, "dbName").to.equal("restoff.json");
		repo.dbName = "new.json";
		expect(repo.dbName, "dbName").to.equal("new.json");

		var repo2 = restlib.lowdbRepo({
			"dbName" : "lowdb",
		});
		expect(repo2.dbName, "dbName").to.equal("lowdb");
	});

	it("03: should have a database engine", function() {
		var repo = restlib.lowdbRepo();
		expect(repo.dbEngine, "dbEngine").to.be.an("function");
	});	

});
