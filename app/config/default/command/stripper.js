var session = require("zed/session");

function Stripper(info, callback) {
    this.path = info.path;
    this.min = info.inserts.preferences.trimEmptyLines ? -1 : 0;
    this.lines = info.inserts.text.split("\n");
    this.currentLine = info.inserts.cursor.row;
    this.final = callback;

    session.isInsertingSnippet(this.path, this.insertingSnippet.bind(this));
}

Stripper.prototype = {
    insertingSnippet: function(err, inserting) {
        if (inserting) {
            this.final();
        } else {
            this.stripTrailing();
        }
    },

    stripTrailing: function() {
        // Strip spaces from the ends of lines.
        for (var i = 0; i < this.lines.length; i++) {
            // Preserve spaces on the line we're on.
            if (i == this.currentLine) {
                continue;
            }

            // Don't do the strip if the line contains only spaces
            // and the preference to trimEmptyLines isn't set.
            var column = this.lines[i].search(/\s+$/);
            if (column > this.min) {
                session.removeInLine(this.path, i, column, this.lines[i].length);
            }
        }

        var lastTwo = this.lines.slice(-2);
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

module.exports = function(info, callback) {
    if (info.internal) {
        // Autostrip, but only if the preference is enabled.
        if (info.inserts.preferences.trimWhitespaceOnSave) {
            new Stripper(info, callback);
        }
    } else {
        // Manual invocation, strip unconditionally.
        new Stripper(info, callback);
    }
};
