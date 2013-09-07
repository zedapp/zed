/*global define ace _*/
define(function(require, exports, module) {
    "use strict";
    var lang = ace.require("ace/lib/lang");

    var settingsfs = require("./fs/settings");
    var eventbus = require("./lib/eventbus");
    var editor = require("./editor");
    var command = require("./command");
    var defaultKeyJson = JSON.parse(require("text!../settings/keys.default.json"));
    var userKeyJson = {};
    var keyboardHandler = null;
    var commands;

    exports.update = function() {
        var CommandManager = ace.require("ace/commands/command_manager").CommandManager;
        var useragent = ace.require("ace/lib/useragent");
        var KeyBinding = ace.require("ace/keyboard/keybinding").KeyBinding;

        var edit = editor.getActiveEditor();
        edit.commands = new CommandManager(useragent.isMac ? "mac" : "win", commands);
        edit.keyBinding = new KeyBinding(edit);
        keyboardHandler = edit.getKeyboardHandler();

        editor.getEditors(true).forEach(function(edit) {
            edit.setKeyboardHandler(keyboardHandler);
        });
    };

    exports.bind = function(name, bindKey, callback) {
        commands.push({
            name: name,
            bindKey: bindKey,
            exec: callback,
            readOnly: true
        });
    };

    var bindCommand = exports.bindCommand = function(cmd, bindKey) {
        try {
            var c = command.lookup(cmd);
            commands.push({
                name: cmd,
                bindKey: bindKey,
                exec: function(editor, args) {
                    return command.exec(cmd, editor, args);
                },
                multiSelectAction: c.multiSelectAction,
                readOnly: c.readOnly
            });
        } catch (e) {
            console.error("Failed to bind keys to command", cmd, "does it exist?", e);
        }
    };

    exports.getCommandKeys = function() {
        var commandKeys = {};
        _.extend(commandKeys, defaultKeyJson, userKeyJson);
        return commandKeys;
    };


    function bindKey(win, mac) {
        return {
            win: win,
            mac: mac
        };
    }

    exports.hook = function() {
        eventbus.once("editorloaded", loadKeys);
    };

    exports.init = function() {
        loadCommands();
        settingsfs.watchFile("/keys.user.json", loadKeys);
    };

    var oldOnCommandKey = null;
    var oldOnTextInput = null;
    exports.tempRebindKeys = function(keyHandler) {
        var edit = editor.getActiveEditor();
        if (oldOnCommandKey) {
            throw new Error("Keys already temporarily bound!");
        }
        oldOnCommandKey = edit.keyBinding.onCommandKey;
        edit.keyBinding.onCommandKey = function(event) {
            var args = arguments;
            keyHandler(event, function() {
                oldOnCommandKey.apply(edit.keyBinding, args);
            });
        };
        oldOnTextInput = edit.keyBinding.onTextInput;
        edit.keyBinding.onTextInput = function(event) {
            var args = arguments;
            keyHandler(event, function() {
                oldOnTextInput.apply(edit.keyBinding, args);
            });
        };
    };

    exports.resetTempRebindKeys = function() {
        var edit = editor.getActiveEditor();
        if (oldOnCommandKey) {
            edit.keyBinding.onCommandKey = oldOnCommandKey;
            edit.keyBinding.onTextInput = oldOnTextInput;
            oldOnCommandKey = null;
            oldOnTextInput = null;
        }
    };

    function loadKeys() {
        settingsfs.readFile("/keys.user.json", function(err, userKeys_) {
            try {
                userKeyJson = JSON.parse(userKeys_);
                loadCommands();
                exports.update();
            } catch (e) {}
        });
    }

    function loadCommands() {
        // Some special builtin commands
        commands = [{
            name: "cut",
            exec: function(editor) {
                var range = editor.getSelectionRange();
                editor._emit("cut", range);

                if (!editor.selection.isEmpty()) {
                    editor.session.remove(range);
                    editor.clearSelection();
                }
            },
            multiSelectAction: "forEach"
        }, {
            name: "insertstring",
            exec: function(editor, str) {
                editor.insert(str);
            },
            multiSelectAction: "forEach"
        }, {
            name: "inserttext",
            exec: function(editor, args) {
                editor.insert(lang.stringRepeat(args.text || "", args.times || 1));
            },
            multiSelectAction: "forEach"
        }];

        Object.keys(defaultKeyJson).forEach(function(cmd) {
            bindCommand(cmd, defaultKeyJson[cmd]);
        });
        Object.keys(userKeyJson).forEach(function(cmd) {
            bindCommand(cmd, userKeyJson[cmd]);
        });
    }
});