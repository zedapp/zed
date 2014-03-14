var config = require("zed/config");
var stripper = require("./stripper");

module.exports = function(options, callback) {
    config.getPreference("trimWhitespaceOnSave", function(err, trim) {
        if (trim) {
            stripper(options, callback);
        }
    });
};
