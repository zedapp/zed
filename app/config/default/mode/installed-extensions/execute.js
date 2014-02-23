define(function(require, exports, module) {
    var session = require("zed/session");
    var zpm = require("zed/zpm");

    return function(info, callback) {
        var path = info.path;

        session.getCursorPosition(path, function(err, pos) {
            session.getAllLines(path, function(err, lines) {
                console.log(JSON.stringify(pos));
                var line = lines[pos.row];
                // Do nothing
                callback();
            });
        });
    };
});