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

        session.getAllLines(this.path, this.stripTrailing.bind(this));
    },

    stripTrailing: function(err, lines) {
        this.lines = lines;

        // Strip spaces from the ends of lines.
        for (var i = 0; i < lines.length; i++) {
            // Preserve spaces on the line we're on.
            if (i == this.currentLine) {
                continue;
            }

            // Don't do the strip if the line contains only spaces
            // and the preference to trimEmptyLines isn't set.
            var index = lines[i].search(/\s+$/);
            if (index > this.min) {
                session.removeInLine(this.path, i, index, lines[i].length);
            }
        }

        var lastTwo = lines.slice(-2);
        if (lastTwo[1] !== "") {
            // Enforce newline at end of file.
            session.append(this.path, "\n", this.final);
        } else if (lastTwo[0] === "" && lastTwo[1] === "") {
            // Strip blank lines from the end.
            this.stripEndLines();
        } else {
            // Perfect!!
            this.final();
        }
    },

    stripEndLines: function() {
        var len = this.lines.length;
        // Don't strip beyond the cursor position.
        for (var i = len; i > this.currentLine; i--) {
            if (this.lines[i - 1] !== "") {
                break;
            }
        }
        if (i < len - 1) {
            session.removeLines(this.path, i, len, this.final);
        }
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
