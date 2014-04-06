var session = require("zed/session");

module.exports = function(info) {
    session.goto(info.destination);
};
