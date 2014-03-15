var session = require("zed/session");

module.exports = function(options, callback) {
    session.toggleFullscreen(callback);
};
