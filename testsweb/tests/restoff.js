describe ("running web specific tests", function() {

	it("should not wipeout Object prototype and be a restoff", function() {
		expect(restoff).to.not.eql(undefined);

		var roff = restoff();
		expect(roff).to.have.property('toString');
		expect(roff).to.have.property('isOnline');
	});

	it("should be offline initially", function() {
		var roff = restoff();
		expect(roff.isOnline).to.be.false;
	});
	
	it("should access a valid endpoint while connected", function() {
		var roff = restoff();
		var user01 = {
			"id": "aedfa7a4-d748-11e5-b5d2-0a1d41d68578",
			"first_name": "Happy",
			"last_name": "User"
		};

		return roff.get("http://test.development.com:4050/testsweb/testdata/user01.json")
		.then(function(result){
			expect(result).to.deep.equals(user01);
			expect(roff.isOnline).to.be.true;
		});
	});

});

