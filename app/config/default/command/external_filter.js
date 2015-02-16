var session = require("zed/session");
var fs = require("zed/fs");
var ui = require("zed/ui");

module.exports = function(info) {
    var text = info.inputs.selectionText;
    var range = info.inputs.selectionRange;
    ui.prompt("External program to filter through", "sort").then(function(cmd) {
        if(!cmd) {
            return;
        }
        return fs.run(cmd.split(/\s+/), text).then(function(output) {
            return session.replaceRange(info.path, range, output);
        });
    });
};
