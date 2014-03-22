var session = require("zed/session");
var project = require("zed/project");

var coffee = require("./coffee-script.js");

/**
 * inputs: text
 */
return function(data, callback) {
    var path = data.path;
    var text = data.inputs.text;
    var jsPath = path.replace(/\.coffee$/, ".js");
    var javascript = coffee.compile(text);
    project.writeFile(jsPath, javascript, function(err) {
        if (err) {
            return session.flashMessage(path, "Error: " + err.message, 2000, callback);
        }
        session.flashMessage(path, "Compilation complete", 500, callback);
    });
};
