var session = require("zed/session");
var config = require("zed/config");
var stuff = {};

module.exports = function (options, callback) {
    stuff.path = options.path;
    stuff.final_callback = callback;

    config.getPreference("trimEmptyLines", getPrefs);
};

function getPrefs(err, trimEmpty) {
    stuff.min = trimEmpty ? -1 : 0;

    session.getCursorPosition(stuff.path, getLine);
}

function getLine(err, cursor) {
    stuff.currentLine = cursor.row;

    session.getAllLines(stuff.path, strip);
}

function strip(err, lines) {
    // Strip spaces from the ends of lines.
    for (var i = 0; i < lines.length; i++) {
        // Preserve spaces on the line we're on.
        if (i == stuff.currentLine) {
            continue;
        }

        // Don't do the strip if the line contains only spaces
        // and the preference to trimEmptyLines isn't set.
        if (lines[i].search(/\s+$/) > stuff.min) {
            lines[i] = lines[i].replace(/\s+$/, "");
        }
    }

    // Strip newlines from the end of the file.
    while (lines[lines.length - 1] === "") {
        lines.pop();
    }

    // Ensure that the file ends with one single newline.
    lines.push("");

    session.setText(stuff.path, lines.join("\n"), stuff.final_callback);
}
