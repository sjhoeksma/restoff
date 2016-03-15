if (typeof angular !== "undefined") {
    angular.module("restoff", [])
        .provider("restoff", [function() {
            var config = null;

            this.setConfig = function(newConfig) {
                config = newConfig;
            };

            this.$get = [function() {
                return new restoff(config);
            }];
        }]);
} // else we aren't using angular
// TODO: When restoff-angular becomes it's own NPM module
// TODO: This should throw an exception and/or notify the user that
// TODO: they need to include angular.js / angular.min.js
