var session = require("zed/session");
var fs = require("zed/fs");

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
    return fs.writeFile(jsPath, javascript).then(function() {
        return session.flashMessage(path, "Compilation complete", 500);
    });
};
