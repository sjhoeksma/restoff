describe ("restoffUriDecoder", function() {

    it("01: should decode a uri of the form http://domainname/roponame/uuid", function() {

        var roff = restlib.restoff({
            rootUri : "http://www.testservice.com",
            dbService : {
                primaryKeyName : "id2",
            }
        });

        var roffUri = restlib.restoffUri(roff);

        var uri = roffUri.uriFromClient("http://www.testservice.com/reponame/b98811b3-51e2-437a-bd74-f68ea02ae6a3", "GET", undefined, {});
        expect(uri.repoName, "repoName").to.equal("reponame");
        expect(uri.primaryKey, "primaryKey").to.equal("b98811b3-51e2-437a-bd74-f68ea02ae6a3");
        expect(uri.restMethod, "restMethod").to.equal("GET");
    });
});

