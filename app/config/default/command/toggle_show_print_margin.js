var config = require("zed/config");

module.exports = function(options, callback) {
    config.togglePreference("showPrintMargin", callback);
};
