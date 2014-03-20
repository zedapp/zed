var session = require("zed/session");

/**
 * Inputs: lines, cursor
 */
module.exports = function(info, callback) {
    var pos = info.inputs.cursor;
    var lines = info.inputs.lines;

    var line = lines[pos.row];
    if (line[0] === "/") {
        return session.goto(line, callback);
    } else if (line[0] === "\t") {
        line = lines[pos.row - 1];
        if (line[0] === "/") {
            return session.goto(line, callback);
        }
    }
    // Do nothing
    callback();
};
