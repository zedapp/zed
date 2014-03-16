var session = require("zed/session");
var config = require("zed/config");

function Stripper(options, callback) {
    this.path = options.path;
    this.final = callback;

    config.getPreference("trimEmptyLines", this.getEmpty.bind(this));
}

Stripper.prototype = {
    getEmpty: function(err, trimEmpty) {
        this.min = trimEmpty ? -1 : 0;

        session.getCursorPosition(this.path, this.getLine.bind(this));
    },

    getLine: function(err, cursor) {
        this.currentLine = cursor.row;

        session.getAllLines(this.path, this.strip.bind(this));
    },

    strip: function(err, lines) {
        // Strip spaces from the ends of lines.
        for (var i = 0; i < lines.length; i++) {
            // Preserve spaces on the line we're on.
            if (i == this.currentLine) {
                continue;
            }

            // Don't do the strip if the line contains only spaces
            // and the preference to trimEmptyLines isn't set.
            if (lines[i].search(/\s+$/) > this.min) {
                lines[i] = lines[i].replace(/\s+$/, "");
            }
        }

        // Strip newlines from the end of the file,
        // but not beyond the cursor position.
        while ((lines[lines.length - 1] === "") &&
               (lines.length > this.currentLine)) {
            lines.pop();
        }

        // Ensure that the file ends with one single newline.
        lines.push("");

        session.setText(this.path, lines.join("\n"), this.final);
    },
};

module.exports = function(options, callback) {
    if (options.internal) {
        // Autostrip, but only if the preference is enabled.
        config.getPreference("trimWhitespaceOnSave", function(err, trim) {
            if (trim) {
                new Stripper(options, callback);
            }
        })
    } else {
        // Manual invocation, strip unconditionally.
        new Stripper(options, callback);
    }
};
