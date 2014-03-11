var session = require("zed/session");
var config = require("zed/config");

module.exports = function(options, callback) {
    config.getPreference("trimEmptyLines", function getPrefs(err, trimEmpty) {
        var min = trimEmpty ? -1 : 0;

        session.getCursorPosition(options.path, function getCurrentLine(err, cursor) {
            var currentLine = cursor.row;

            session.getAllLines(options.path, function trimWhitespace(err, lines) {
                // Strip spaces from the ends of lines.
                for (var i = 0; i < lines.length; i++) {
                    // Preserve spaces on the line we're on.
                    if (i == currentLine) {
                        continue;
                    }

                    // Don't do the strip if the line contains only spaces
                    // and the preference to trimEmptyLines isn't set.
                    if (lines[i].search(/\s+$/) > min) {
                        lines[i] = lines[i].replace(/\s+$/, "");
                    }
                }

                // Strip newlines from the end of the file.
                while (lines[lines.length - 1] === "") {
                    lines.pop();
                }

                // Ensure that the file ends with one single newline.
                lines.push("");

                session.setText(options.path, lines.join("\n"), callback);
            });
        });
    });
};
