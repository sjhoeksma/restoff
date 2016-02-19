describe("restoff framework", function() {
	it("should not wipeout Object prototype and be a restoff", function() {
		expect(restoff).to.not.eql(undefined);

		var roff = restoff();
		expect(roff).to.have.property('toString');
		expect(roff).to.have.property('isOnline');
	});

	it("should be offline initially", function() {
		var rest_off = restoff();
		expect(rest_off.isOnline).to.be.false;
	});
});