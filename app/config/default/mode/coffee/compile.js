var session = require("zed/session");
var project = require("zed/project");

var coffee = require("./coffee-script.js");

/**
 * inputs: text
 */
return function(data) {
    var path = data.path;
    var text = data.inputs.text;
    var jsPath = path.replace(/\.coffee$/, ".js");
    var javascript = coffee.compile(text);
    return project.writeFile(jsPath, javascript).then(function() {
        return session.flashMessage(path, "Compilation complete", 500);
    });
};
