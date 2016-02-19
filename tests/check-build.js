var pkg = require('../package.json');

describe("the modules were built correctly", function() {
	it("should have the libary", function() {
		expect(restoff).to.not.eql(undefined);
	});

	it("should have the correct version", function() {
		expect(restlib["version-" + pkg.namesub]).to.equal('0.0.1');
	});
});