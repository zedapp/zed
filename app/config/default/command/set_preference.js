var config = require("zed/config");

module.exports = function(info) {
    return config.setPreference(info.preference, info.value);
};
