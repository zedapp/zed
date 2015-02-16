var session = require("zed/session");
var fs = require("zed/fs");
var ui = require("zed/ui");

module.exports = function(info) {
    ui.prompt("External program to run", "ls -l").then(function(cmd) {
        if(!cmd) {
            return;
        }
        return fs.run(cmd.split(/\s+/)).then(function(output) {
            return session.insertAtCursor(info.path, output);
        });
    });
};
