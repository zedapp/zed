exports.indexToLine = function(text, index) {
    var s = text.substring(0, index);
    return s.split("\n").length;
};
exports.indexToPos = function(text, index) {
    var row = 0;
    var column = 0;
    for (var i = 0; i < index && i < text.length; i++) {
        if (text[i] === "\n") {
            row++;
            column = 0;
        } else {
            column++;
        }
    }
    return {
        row: row,
        column: column
    };
};