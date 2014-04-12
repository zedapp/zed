var session = require("zed/session");
var project = require("zed/project");

//var livescript = require("./lib/livescript.js");
var lsc = require("./livescript.js").LiveScript;

/**
 * inputs: text
 */
return function(data) {
    var path = data.path;
    var text = data.inputs.text;
    var jsPath = path.replace(/\.ls$/, ".js");
    var javascript = lsc.compile(text);
    return project.writeFile(jsPath, javascript).then(function() {
        return session.flashMessage(path, "Compilation complete", 500);
    });
};
