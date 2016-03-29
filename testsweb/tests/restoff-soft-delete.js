describe ("restoffSoftDelete", function() {

	it("01: should not return records marked as deleted.", function() {
		var roff = restlib.restoff({ "rootUri" : ROOT_URI });
		var repository = "users23";
		return Promise.all([
			roff.clear(repository, true),
			roff.get(repository)
		]).then(function() {
			return roff.get(repository).then(function(result) {
				expect (result.length, "should return the deleted record").to.equal(4); // returned the soft deleted records because soft delete field has not been set yet

				roff.dbService.reconSettings = {
					lastUpdatedFieldName: "last_updated",
						softDeleteFieldName: "update_type",
					softDeleteValue: "DELETE"
				};

				return roff.get(repository).then(function(result) {
					expect (result.length, "should return the deleted record").to.equal(3); // returned the soft deleted records because soft delete field has not been set yet
				});
			});
		});
	});
});
