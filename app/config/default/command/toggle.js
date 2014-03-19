var config = require("zed/config");

module.exports = function(info, callback) {
    config.togglePreference(info.preference, callback);
};
