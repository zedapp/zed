var session = require("zed/session");

/**
 * Inputs: lines, cursor
 */
module.exports = function(info) {
    var pos = info.inputs.cursor;
    var lines = info.inputs.lines;

    // Search backwards for the command title to invoke, aborting
    // if we find a section header.
    for (var i = pos.row; i > 1 && lines[i][0] !== ">"; --i) {
        if (lines[i][0] === "#") {
            return;
        }
    }

    var command = lines[i + 2].match(/^   `(.*)`$/)[1];
    if (command) {
        session.callCommand(info.path, command);
    }
};
