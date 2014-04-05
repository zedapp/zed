var session = require("zed/session");

/**
 * Inputs: lines, cursor
 */
module.exports = function(info) {
    var command = info.inputs.lines[info.inputs.cursor.row].match(/^   `(.*)`$/)[1];
    if (command) {
        session.callCommand(info.path, command);
    }
};
