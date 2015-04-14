var session = require("zed/session");

module.exports = function(info){
    var pos = info.inputs.cursor;
    var lines = info.inputs.lines;
    var row = pos.row;

    pos.column = 0;
    pos.row += info.go;
    session.insert(info.path, pos, (lines[row].match(/^\s+/) || [""])[0] + "\n");
    session.callCommand(info.path, info.go === 0 ? "Cursor:Up" : "Cursor:Down");
    session.callCommand(info.path, "Cursor:Line End");
};
