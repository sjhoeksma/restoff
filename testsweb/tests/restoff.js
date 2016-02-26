describe ("restoff", function() {

	var ROOT_URI = "http://test.development.com:3000/";

	function testLog(text) {
		if (false) {
			console.log(text);
		}
	}

	it("01: should, when online, handle network errors", function() {
		return restoff().get("http://idontexisthopefully.com").then(function(result) {
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

		return roff.get(userRepo).then(function(result) {
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


	it("03: should not wipeout Object prototype and be a restoff", function() {
		expect(restoff, "restoff").to.not.eql(undefined);

		var roff = restoff();

		expect(roff.ONLINE_UNKNOWN, "ONLINE_UNKNOWN").to.equal(null);
		expect(roff.ONLINE, "ONLINE").to.equal(true);
		expect(roff.ONLINE_NOT, "ONLINE_NOT").to.equal(false);
	});

	it("04: should have an unknown online status", function() {
		var roff = restoff();
		expect(roff.isOnline, "isOnline").to.be.false;
		expect(roff.isOffline, "isOnline").to.be.false;
		expect(roff.isOnlineUnknown, "isOnline").to.be.true;
		expect(roff.isForcedOffline, "isForcedOffline ").to.be.false;
	});

	it("05: should handle config settings correctly", function() {
		var roff = restoff();
		expect(roff.rootUri, "rootUri").to.equal("");
		expect(roff.dbName, "dbName").to.equal("restoff");
		roff.rootUri = ROOT_URI + "testsweb/testdata";
		expect(roff.rootUri, "rootUri").to.equal(ROOT_URI + "testsweb/testdata");

		roff.dbName = "new.json";
		expect(roff.dbName, "dbName").to.equal("new.json");
		expect(roff.primaryKeyName, "primaryKeyName").to.equal("id");

		var roff2 = restoff({
			"rootUri" : ROOT_URI + "testsweb/testdata2",
			"dbName" : "loki.json",
			"primaryKeyName" : "id2"
		});
		expect(roff2.rootUri, "rootUri").to.equal(ROOT_URI + "testsweb/testdata2");
		expect(roff2.dbName, "dbName").to.equal("loki.json");
		expect(roff2.primaryKeyName, "primaryKeyName").to.equal("id2");
	});
	
	it("06: should access a valid endpoint while connected\
		and return back a javascript object", function() {
		var dbSource = restoff({
			"rootUri" : ROOT_URI
		});
		var roff = restoff({
			"rootUri" : ROOT_URI
		});
		var userRepo = "users01";

		return dbSource.get(userRepo).then(function(source) {
			expect(dbSource.repositoryGet(userRepo).length, userRepo + " Repository size").to.equal(1);
			expect(dbSource.repositoryGet(userRepo).length, userRepo + " repository count ").to.equal(1);
			return roff.get(userRepo).then(function(result){
				expect(result, "User result").to.deep.equals(source);
				expect(roff.isOnline, "isOnline").to.be.true;
				expect(roff.isOffline, "isOnline").to.be.false;
				expect(roff.isOnlineUnknown, "isOnline").to.be.false;
			});
		}).catch(function(error) {
			expect(true, "Did you run gulp restserver?").to.equal.false;
		});
	});

	it("07: should handle an invalid endpoint while connected", function() {
		return restoff().get("http://test.development.com:4000/testsweb/testdata/user02.json").then(function(result) {
				expect(true,"Catch promise should execute.").to.equal(false);
			}).catch(function(error) {
				var errorExpected = {
					message: "Network Error",
					messageDetail: "",
					status: 0,
					uri: "http://test.development.com:4000/testsweb/testdata/user02.json"
				};
				expect(error, "Error result").to.deep.equals(errorExpected);
			})
		;
	});

	it("08: should store a RESTful call to the local repository, \
		figure out correct repository name and\
		the RESTful call should still work even when offline\
		.", function() {
		var roff = restoff({
			"rootUri" : ROOT_URI
		});
		var dbSource = restoff({
			"rootUri" : ROOT_URI
		});
		var userRepo = "users01";

		expect(roff.repositorySize, "Repository size").to.equal(0);
		expect(dbSource.repositorySize, "Repository size").to.equal(0);
		return dbSource.get(userRepo).then(function(source) {
			expect(dbSource.repositoryGet(userRepo)["aedfa7a4-d748-11e5-b5d2-0a1d41d68577"], userRepo + " repository").to.be.an("object");
			expect(roff.repositoryGet(userRepo)["aedfa7a4-d748-11e5-b5d2-0a1d41d68577"], userRepo + " repository").to.be.an("undefined");
			return roff.get(userRepo).then(function(users){
				expect(users, userRepo + " object").to.deep.equals(source);
				expect(roff.repositorySize, "Repository size").to.equal(1);
				expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(source);
				roff.forceOffline();
				return roff.get(userRepo).then(function(users2) {
						expect(users2, userRepo + " object").to.deep.equals(source);
						expect(roff.repositorySize, "Repository size").to.equal(1);
						expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(source);
				});
			});
		}).catch(function(error) {
			console.log(error);
			expect(true, "Did you run gulp restserver?").to.equal.false;
		});
	});

	it("09: should support a non-standard RESTful api\
			and non-standard primaryKeyName ", function() {
		var roff = restoff({
			"rootUri" : "http://test.development.com:4050/testsweb/testdata",
			"primaryKeyName" : "guid"
		});

		var addressToAdd = {
			"guid": "aedfa7a4-d748-11e5-b5d2-0a1d41d68579",
			"address": "1347 Pacific Avenue, Suite 201",
			"city": "Santa Cruz",
			"zip": "95060"
		};

		var addressesToAdd = [];
		addressesToAdd["aedfa7a4-d748-11e5-b5d2-0a1d41d68579"] = addressToAdd;

		return roff.get("http://test.development.com:4050/testsweb/testdata/addresses").then(function(addresses){
			expect(addresses, "Address object").to.deep.equals(addressesToAdd);
			expect(roff.repositorySize, "Repository size").to.equal(1);
			expect(roff.repository["addresses"], "Address object").to.deep.equals(addressesToAdd);
		});
	});

	it("10: should support more than one repository", function() {
		var dbSource = restoff({
			"rootUri" : ROOT_URI
		});
		var userRepo = "users01";
		var addressRepo = "addresses01";

		return dbSource.get(userRepo).then(function(users) {
			return dbSource.get(addressRepo).then(function(addresses){
				expect(dbSource.repositorySize, "Repository size").to.equal(2);
				expect(dbSource.repositoryGet(userRepo)["aedfa7a4-d748-11e5-b5d2-0a1d41d68577"], userRepo + " repository").to.be.an("object");
				expect(dbSource.repositoryGet(addressRepo)["aedfa7a4-d748-11e5-b5d2-0a1d41d68579"], userRepo + " repository").to.be.an("object");
				expect(dbSource.repositoryGet(userRepo), userRepo + " object").to.deep.equals(users);
				expect(dbSource.repository[addressRepo], addressRepo + " object").to.deep.equals(addresses);
			});
		});
	});

	it("11: should be able to clear a repository leaving an 'empty' repository\
		and not add a repository if it exists\
		and not delete any data from the actual data source.", function() {
		var roff = restoff({
			"rootUri" : ROOT_URI
		});
		var userRepo = "users01";

		// expect(roff.repositorySize, "Repository size").to.equal(0);
		return roff.get(userRepo).then(function(users){
			expect(roff.repositorySize, "Repository size").to.equal(1);
			expect(roff.repositoryGet(userRepo)["aedfa7a4-d748-11e5-b5d2-0a1d41d68577"], userRepo + " repository").to.be.an("object");
			expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(users);
			roff.clearCacheBy(userRepo);
			expect(roff.repositorySize, "Repository size").to.equal(1);
			expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals([]);
			roff.clearCacheBy("not_a_repo");
			expect(roff.repositorySize, "Repository size").to.equal(1);
			
			// Verify we did not delete any data from actual data source
			var dbSource = restoff({
				"rootUri" : ROOT_URI
			});
			return dbSource.get(userRepo).then(function(users){
				expect(dbSource.repositorySize, "Repository size").to.equal(1);
				expect(dbSource.repositoryGet(userRepo)["aedfa7a4-d748-11e5-b5d2-0a1d41d68577"], userRepo + " repository").to.be.an("object");
				expect(dbSource.repositoryGet(userRepo), userRepo + " object").to.deep.equals(users);
			})
		});
	});

	it("12: should be able to clear all repositories leaving an 'empty' repository\
		    but not delete actual data on the backend.", function() {
		var dbSource = restoff({
			"rootUri" : ROOT_URI
		});			
		var userRepo = "users01";
		var addressRepo = "addresses01";

		return dbSource.get(userRepo).then(function(users) {
			return dbSource.get(addressRepo) .then(function(addresses){
				expect(dbSource.repositorySize, "Repository size").to.equal(2);
				expect(dbSource.repositoryGet(userRepo), userRepo + " object").to.deep.equals(users);
				expect(dbSource.repository[addressRepo], addressRepo + " object").to.deep.equals(addresses);
				dbSource.clearCacheAll();
				expect(dbSource.repositorySize, "Repository size").to.equal(2);
				expect(dbSource.repositoryGet(userRepo), userRepo + " object").to.deep.equals([]);
				expect(dbSource.repository[addressRepo], addressRepo + " object").to.deep.equals([]);
			});
		});
	});

	it("13: should support adding parameters automatically\
		and will overwrite an existing parameter with the new value\
		and it can support multiple auto parameters\
		and it will append if there are already parameters in the uri passed\
		and it will remove any uri parameters when figuring out a repo name", function() {
		var roff = restoff({
			"rootUri" : ROOT_URI
		}).autoQueryParamSet("access_token", "rj5aabcea");

		expect(roff, "roff").to.be.an('object');
		expect(roff.autoQueryParamSetGet("access_token"), "access_token").to.equal("rj5aabcea");

		roff.autoQueryParamSet("access_token", "rj5aabcea2");
		expect(roff.autoQueryParamSetGet("access_token"), "access_token").to.equal("rj5aabcea2");
		roff.autoQueryParamSet("another_auto", "another_value");

		var generated = roff.uriGenerate("users");
		expect(generated, "Generated uri").to.equal(ROOT_URI + "users?access_token=rj5aabcea2&another_auto=another_value");

		var generated2 = roff.uriGenerate("users?already=added");
		expect(generated2, "Generated uri").to.equal(ROOT_URI + "users?already=added&access_token=rj5aabcea2&another_auto=another_value");

		var userRepo = "users01";
		return roff.get(userRepo).then(function(users){
			expect(roff.repositorySize, "Repository size").to.equal(1);
			expect(roff.repositoryGet(userRepo), userRepo  + " object").to.deep.equals(users);
		});

	});

	it("14: should support adding headers automatically", function() {
		var roff = restoff({
			"rootUri" : ROOT_URI
		}).autoHeaderParamSet("access_token", "rj5aabcea");

		expect(roff, "roff").to.be.an('object');
		expect(roff.autoHeaderParamSetGet("access_token"), "access_token").to.equal("rj5aabcea");

		var userRepo = "users01";

		return roff.get(userRepo).then(function(users){
			expect(roff.repositorySize, "Repository size").to.equal(1);
			expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(users);
		});
	});	

	it("15: should add the rootUri to a get when the domain/protocol is missing", function() {
		var roff = restoff({
			"rootUri" : ROOT_URI
		});

		var userRepo = "users01";

		return roff.get(userRepo).then(function(users){
			expect(roff.repositorySize, "Repository size").to.equal(1);
			expect(roff.repositoryGet(userRepo), userRepo + " object").to.deep.equals(users);
		}).catch(function(error) {
			console.log(error);
			expect(true, "Should have no error").to.equal(false);
		});
	});

});

