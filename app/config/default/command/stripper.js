var session = require("zed/session");

module.exports = function(info) {
    // Don't strip while inserting snippets, or auto-strip when pref not set.
    if (info.inputs.isInsertingSnippet || (!info.inputs.preferences.trimWhitespaceOnSave && info.internal)) {
        return;
    }

    var min = info.inputs.preferences.trimEmptyLines ? -1 : 0;

    var currentLines = info.inputs.cursors.map(function(c) {
        return c.row;
    });
    var lines = info.inputs.lines;
    var lastNonBlank = 0;

    for (var i = 0; i < lines.length; i++) {
        if (/\S/.test(lines[i])) {
            lastNonBlank = i;
        }
        // Preserve spaces on the line we're on.
        if (currentLines.indexOf(i) !== -1) {
            continue;
        }

        var column = lines[i].search(/\s+$/);
        if (column > min) {
            session.removeInLine(info.path, i, column, lines[i].length);
        }
    }

    if (lines[lines.length - 1] !== "") {
        // Enforce newline at end of file.
        return session.append(info.path, "\n").then(function() {
            if (currentLines[0] === lines.length - 1) {
                session.callCommand(info.path, "Cursor:Left");
            }
        });
    } else {
        // Strip blank lines, but not above the cursor position.
        var row = Math.max(currentLines[0], lastNonBlank) + 1;
        if (row < lines.length - 1) {
            return session.removeLines(info.path, row, lines.length);
        }
    }
};
