define(function(require, exports, module) {
    var editor = require("editor");
    var state = null; // delayed: require("state");
    
    /**
     * Hack required because module loading in browsers sucks.
     */
    exports.hook = function() {
        require(["state"], function(state_) {
            state = state_;
        });
    };
    
    var commands = {
        sort: function(text) {
            return text.split("\n").sort().join("\n");
        },
        setTheme: function(theme) {
            editor.getEditors(true).forEach(function(edit) {
                edit.setTheme("ace/theme/" + theme);
                state.set("editor.theme", "ace/theme/" + theme);
                edit.renderer.on("themeLoaded", function() {
                    console.log("Theme successfully loaded!");
                });
            });
        }
    };
    
    var commandPreprocessors = [];
    
    function esc(s) {
        return s.replace('"', '\\"');
    }
    
    commandPreprocessors.push(function dotCommand(command) {
        if(command[0] === '.')
            return "text" + command;
    });
    
    commandPreprocessors.push(function replaceCommand(command) {
        if(command[0] == 's' && command[1] === '/') {
            var parts = command.split('/');
            var findText = parts[1];
            var replaceByText = parts[2];
            var modifiers = parts[3];
            return 'text.replace(/' + findText + '/' + modifiers +
                   ', "' + esc(replaceByText) + '");';
        }
    });
    
    commandPreprocessors.push(function findCommand(command) {
        if(command[0] == '/')
            return 'edit.findAll("' + esc(command.substring(1)) + '");';
    });
    
    function sandboxEval(command) {
        commandPreprocessors.forEach(function(preprocessor) {
            var newCommand = preprocessor(command);
            if(newCommand)
                command = newCommand;
        });
        var edit = editor.getActiveEditor();
        var selectionRange = edit.selection.getRange();
        var session = edit.getSession();
        var text;
        if(!selectionRange.isEmpty())
            text = session.getTextRange(selectionRange);
        else
            text = session.getValue();
        
        // This is where the magic happens
        console.log("Executing: ", command);
        with(exports.commands) {
            var result = eval(command);
        }
        
        if(typeof result === 'function')
            result = result(text);

        console.log("Eval result:", result);
        if(typeof result === "string") {
            if(!selectionRange.isEmpty())
                session.replace(selectionRange, result);
            else
                session.setValue(result);
        }
    }
    
    exports.sandboxEval = sandboxEval;
    exports.commands = commands;
    exports.commandPreprocessors = commandPreprocessors;
});