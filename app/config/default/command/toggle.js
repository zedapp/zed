var config = require("zed/config");

module.exports = function(info) {
    return config.togglePreference(info.preference);
};
