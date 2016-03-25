describe ("restoffUriDecoder", function() {

    it("01: should decode a uri of the form http://domainname/roponame/uuid", function() {

        var roff = restlib.restoff({
            rootUri : "http://www.testservice.com/",
        });

        var roffUri = restlib.restoffUri(roff);

        // Full URI Provided
        var uri = roffUri.uriFromClient("http://www.testservice.com/reponame/b98811b3-51e2-437a-bd74-f68ea02ae6a3", "GET", undefined, {});
        expect(uri.repoName, "repoName").to.equal("reponame");
        expect(uri.primaryKey, "primaryKey").to.equal("b98811b3-51e2-437a-bd74-f68ea02ae6a3");
        expect(uri.restMethod, "restMethod").to.equal("GET");
        expect(uri.uriFinal, "uriFinal").to.equal("http://www.testservice.com/reponame/b98811b3-51e2-437a-bd74-f68ea02ae6a3");


        // Partial URI Provided: rootUri is appended
        var uri2 = roffUri.uriFromClient("reponame/b98811b3-51e2-437a-bd74-f68ea02ae6a4", "GET", undefined, {});
        expect(uri2.repoName, "repoName").to.equal("reponame");
        expect(uri2.primaryKey, "primaryKey").to.equal("b98811b3-51e2-437a-bd74-f68ea02ae6a4");
        expect(uri2.uriFinal, "uriFinal").to.equal("http://www.testservice.com/reponame/b98811b3-51e2-437a-bd74-f68ea02ae6a4");

        // RepoName part of options
        var uri3 = roffUri.uriFromClient("reponame/b98811b3-51e2-437a-bd74-f68ea02ae6a5", "GET", undefined, {repoName:"not_repoName"});
        expect(uri3.repoName, "repoName").to.equal("not_repoName");
        expect(uri3.primaryKey, "primaryKey").to.equal("b98811b3-51e2-437a-bd74-f68ea02ae6a5");
        expect(uri3.uriFinal, "uriFinal").to.equal("http://www.testservice.com/reponame/b98811b3-51e2-437a-bd74-f68ea02ae6a5");


        // RepoName part of options
        var uri4 = roffUri.uriFromClient("reponame/b98811b3-51e2-437a-bd74-f68ea02ae6a6", "GET", undefined, {repoName:"not_repoName"});
        expect(uri4.repoName, "repoName").to.equal("not_repoName");
        expect(uri4.primaryKey, "primaryKey").to.equal("b98811b3-51e2-437a-bd74-f68ea02ae6a6");
        expect(uri4.uriFinal, "uriFinal").to.equal("http://www.testservice.com/reponame/b98811b3-51e2-437a-bd74-f68ea02ae6a6");
    });

    // A domain may contain multiple RESTful apis denoted in the URI in some way. These need to be easily distinguished
    // from Repository names and primary keys. We can filter out this part of the URI.
    it("02: should decode a uri of the form http://domainname/rootcall/roponame/uuid and http://domainname/rootcallB/roponame/uuid", function() {
        var roff = restlib.restoff({
            rootUri : "http://www.testservice.com/",
            uriOptions: {
                filter: ["humanresources/", "accounting/"]
            }
        });

        var roffUri = roff.restoffUri;

        var uri = roffUri.uriFromClient("humanresources/employees/b98811b3-51e2-437a-bd74-f68ea02ae6b0", "GET", undefined, {});
        expect(uri.repoName, "repoName").to.equal("employees");
        expect(uri.primaryKey, "primaryKey").to.equal("b98811b3-51e2-437a-bd74-f68ea02ae6b0");
        expect(uri.uriFinal, "uriFinal").to.equal("http://www.testservice.com/humanresources/employees/b98811b3-51e2-437a-bd74-f68ea02ae6b0");

        var uri2 = roffUri.uriFromClient("accounting/users/b98811b3-51e2-437a-bd74-f68ea02ae6b1", "GET", undefined, {});
        expect(uri2.repoName, "repoName").to.equal("users");
        expect(uri2.primaryKey, "primaryKey").to.equal("b98811b3-51e2-437a-bd74-f68ea02ae6b1");
        expect(uri2.uriFinal, "uriFinal").to.equal("http://www.testservice.com/accounting/users/b98811b3-51e2-437a-bd74-f68ea02ae6b1");

    });


});

