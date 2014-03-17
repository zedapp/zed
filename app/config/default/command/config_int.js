var config = require("zed/config");

module.exports = function(info, callback) {
    config.incrementInteger(info.preference, info.amount, callback);
};
