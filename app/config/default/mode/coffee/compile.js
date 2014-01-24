define(function(require, exports, module) {
    var session = require("zed/session");
    var project = require("zed/project");

    var coffee = require("configfs!./coffee-script.js");

    return function(data, callback) {
        var path = data.path;
        var jsPath = path.replace(/\.coffee$/, ".js");
        session.getText(path, function(err, text) {
            var javascript = coffee.compile(text);
            project.writeFile(jsPath, javascript, function(err) {
                if(err) {
                    return session.flashMessage(path, "Error: " + err.message, 2000, callback);
                }
                session.flashMessage(path, "Compilation complete", 500, callback);
            });
        });
    };
});