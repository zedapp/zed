/**
 * This module implements all key handing within the editor, overriding ACE's
 * own key handlers.
 */
/*global define, ace, _*/
define(function(require, exports, module) {
    "use strict";
    var lang = ace.require("ace/lib/lang");

    var eventbus = require("./lib/eventbus");
    var editor = require("./editor");
    var command = require("./command");
    var keys = JSON.parse(require("text!../config/default/keys.json"));
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

    function bindCommand(cmd, bindKey) {
        try {
            var c = command.lookup(cmd);
            commands.push({
                name: cmd,
                bindKey: bindKey,
                exec: function(edit, args) {
                    return command.exec(cmd, edit, edit.getSession(), args);
                },
                multiSelectAction: c.multiSelectAction,
                readOnly: c.readOnly
            });
        } catch (e) {
            console.warn("Failed to bind keys to command", cmd, ", maybe not yet defined?", e);
        }
    }

    exports.getCommandKeys = function() {
        return keys;
    };

    exports.hook = function() {
        eventbus.on("commandsloaded", function() {
            loadCommands();
            exports.update();
        });
        eventbus.on("configchanged", function(config) {
            keys = config.getKeys();
            loadCommands();
            exports.update();
        });
    };

    exports.init = function() {
        loadCommands();
    };

    // Hacky way of temporarily overriding the key handlers, used e.g. during
    // code complete mode
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
            exec: function(editor, session, args) {
                editor.insert(lang.stringRepeat(args.text || "", args.times || 1));
            },
            multiSelectAction: "forEach"
        }];

        _.each(keys, function(cmd, name) {
            bindCommand(name, cmd);
        });
    }
});
