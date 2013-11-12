define(function(require, exports, module) {
    var session = require("zed/session");

    return function(info, callback) {
        var path = info.path;

        session.getCursorPosition(path, function(err, pos) {
            session.getAllLines(path, function(err, lines) {
                var line = lines[pos.row];
                if(line[0] === "/") {
                    return session.goto(line, callback)
                } else if(line[0] === "\t") {
                    line = lines[pos.row-1];
                    if(line[0] === "/") {
                        return session.goto(line, callback);
                    }
                }
                // Do nothing
                callback();
            });
        });
    };
});