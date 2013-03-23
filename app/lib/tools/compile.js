define(function(require, exports, module) {
    var command = require("../command");
    var tools = require("../tools");
    var project = require("../project");
    var session_manager = require("../session_manager");
    var eventbus = require("../eventbus");
    
    function compile(session) {
        eventbus.emit("sessionactivitystarted", session, "Compiling");
        tools.run(session, "compile", {path: session.filename}, session.getValue(), function(err, result) {
            if(err) {
                return eventbus.emit("sessionactivityfailed", session, "Compilation not supported.");
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
            project.writeFile(outputPath, content, function(err) {
                if(err) {
                    return eventbus.emit("sessionactivityfailed", session, "Could not write to file: " + err);
                }
                eventbus.emit("sessionactivitycompleted", session);
                session_manager.handleChangedFile(outputPath);
                eventbus.emit("newfilecreated", outputPath);
            });
        });
    }
    
    command.define("Tools:Compile", {
        exec: function(edit) {
            compile(edit.getSession());
        }
    });
});