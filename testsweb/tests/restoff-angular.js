describe ("restoffAngularProvider", function() {

	it("01: should be a valid provider and support setting the configuration", function() {

		// Example usage of restoff Angular provider
		angular.module("fakeRoot", ["restoff"])
			.config(["restoffProvider", function (restoffProvider) {
				restoffProvider.setConfig({
					rootUri:"http://localhost/"
				});
			}]);

		var restoff = angular.injector(["fakeRoot"]).get("restoff");
		expect(restoff.rootUri, "should configure correctly").to.equal("http://localhost/");
	});
});

