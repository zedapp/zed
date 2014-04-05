var session = require("zed/session");

module.exports = function(info) {
    var lines = info.inputs.lines;
    var chars = info.inputs.text;
    var words = chars.split(/\s+/);
    var nospaces = words.join("");

    session.goto("zed::statistics");
    session.setText("zed::statistics",
        "Statistics for document:              " + info.path +
        "\nNumber of lines:                      " + lines.length +
        "\nNumber of words:                      " + words.length +
        "\nNumber of characters (no spaces):     " + nospaces.length +
        "\nNumber of characters (with spaces):   " + chars.length);
};
