define(function(require, exports, module) {
    var command = require("./command");
    var tools = require("./tools");
    var project = require("./project");
    var session_manager = require("./session_manager");
    
    function compile(session) {
        tools.run(session, "compile", {path: session.filename}, session.getValue(), function(err, result) {
            if(err) {
                return console.error("Compilation not supported.");
            }
            if(typeof result == "string") {
                try {
                    result = JSON.parse(result);
                } catch(e) {
                    return console.error("Error parsing JSON", result, ":", e);
                }
            }
            var outputPath = result.outputPath;
            var content = result.content;
            project.writeFile(outputPath, content, function(err, result) {
                if(err) {
                    return console.error("Error writing to", outputPath, err);
                }
                console.log("Writing compiled file: ", result);
                session_manager.handleChangedFile(outputPath);
            });
        });
    }
    
    command.define("Tools:Compile", {
        exec: function(edit) {
            compile(edit.getSession());
        }
    });
});