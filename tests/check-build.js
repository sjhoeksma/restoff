var pkg = require('../package.json');

describe("the modules were built correctly", function() {
	it("should have the correct version", function() {
		expect(restlib["version-" + pkg.namesub]).to.equal("0.2.4");
	});
});