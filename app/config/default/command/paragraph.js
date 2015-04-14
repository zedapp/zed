var session = require("zed/session");


function movement(info, row, regex, command) {
    var line = true;
    do {
        row += info.go;
        session.callCommand(info.path, command);
        line = info.inputs.lines[row];
    }
    while (line && !line.match(regex));
    return row;
}


module.exports = function(info){
    var row = info.inputs.cursor.row;
    var command = info.go < 0 ? "Cursor:Up" : "Cursor:Down";
    var empty_line = /^\s*$/;

    // If we're on an empty line, move to the first non-empty.
    if (info.inputs.lines[row].match(empty_line)) {
        row = movement(info, row, /\S/, command);
    }

    // Continue moving to the next empty line.
    row = movement(info, row, empty_line, command);

    // FIXME: This is a workaround for the cursor going off the screen.
    session.callCommand(info.path, "Cursor:Center");

    if (info.select) {
        command = info.go > 0 ? "Select:Up" : "Select:Down";
        info.go *= -1;
        movement(info, row, empty_line, command);
    }
};
