/**
 * This module implements all key handing within the editor, overriding ACE's
 * own key handlers.
 */
/*global define, ace, _*/
define(function(require, exports, module) {
    "use strict";
    var lang = require("ace/lib/lang");

    var CommandManager = require("ace/commands/command_manager").CommandManager;
    var useragent = require("ace/lib/useragent");
    var KeyBinding = require("ace/keyboard/keybinding").KeyBinding;

    var eventbus = require("./lib/eventbus");
    var editor = require("./editor");
    var command = require("./command");

    var keys = JSON.parse(require("text!../config/default/keys.json"));

    function updateAllEditors() {
        editor.getEditors(true).forEach(function(edit) {
            updateEditor(edit);
        });
    }

    function updateEditor(edit) {
        var commands = loadCommands(edit.getSession().mode);
        edit.commands = new CommandManager(useragent.isMac ? "mac" : "win", commands);
        edit.keyBinding = new KeyBinding(edit);
        edit.getKeyboardHandler();
    }

    function bindCommand(commands, cmd, bindKey) {
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
            updateAllEditors();
        });
        eventbus.on("configchanged", function(config) {
            keys = config.getKeys();
            updateAllEditors();
        });
        eventbus.on("switchsession", function(edit, session) {
            var mode = session.mode;
            if(!mode) {
                return;
            }
            require(["./config"], function(config) {
                keys = _.extend({}, config.getKeys(), mode.keys);
                updateEditor(edit);
            });
        });
    };

    function loadCommands(mode) {
        // Some special builtin commands
        var commands = [{
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
            bindCommand(commands, name, cmd);
        });

        if(mode) {
            _.each(mode.keys, function(cmd, name) {
                bindCommand(commands, name, cmd);
            });
        }

        return commands;
    }
});
