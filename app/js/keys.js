/**
 * This module implements all key handing within the editor, overriding ACE's
 * own key handlers.
 */
/*global define, ace, _, zed*/
define(function(require, exports, module) {
    "use strict";

    plugin.consumes = ["eventbus"];
    plugin.provides = ["keys"];
    return plugin;

    function plugin(options, imports, register) {
        var lang = require("ace/lib/lang");
        var CommandManager = require("ace/commands/command_manager").CommandManager;
        var useragent = require("ace/lib/useragent");

        var eventbus = imports.eventbus;

        var keys = JSON5.parse(require("text!../config/default/keys.json"));


        var api = {
            hook: function() {
                eventbus.on("commandsloaded", function() {
                    updateAllEditors();
                });
                eventbus.on("configchanged", function(config) {
                    keys = config.getKeys();
                    updateAllEditors();
                });
                eventbus.on("switchsession", function(edit, session) {
                    var mode = session.mode;
                    if (!mode) {
                        return;
                    }

                    keys = _.extend({}, zed.getService("config").getKeys(), mode.keys);
                    updateEditor(edit);
                });
            },
            getCommandKeys: function() {
                return keys;
            }
        };

        function updateAllEditors() {
            zed.services.editor && zed.getService("editor").getEditors(true).forEach(function(edit) {
                updateEditor(edit);
            });
        }

        function updateEditor(edit) {
            var commands = loadCommands(edit.getSession().mode);
            edit.commands = new CommandManager(useragent.isMac ? "mac" : "win", commands);
            edit.$mergeableCommands = ["insertstring", "Edit:Backspace", "Edit:Delete"];
            edit.commands.on("exec", edit.$historyTracker.bind(edit));
            edit.$initOperationListeners();
            edit.keyBinding.setDefaultHandler(edit.commands);
            edit.getKeyboardHandler();
        }

        function bindCommand(commands, cmd, bindKey) {
            var command = zed.getService("command");
            var c = command.lookup(cmd);
            if (!c) {
                // Command not yet available, maybe sandbox hasn't booted up yet
                return;
                // return console.warn("Failed to bind keys to command", cmd, ", maybe not yet defined?");
            }
            commands.push({
                name: cmd,
                bindKey: bindKey,
                exec: function(edit, args) {
                    return command.exec(cmd, edit, edit.getSession(), args);
                },
                multiSelectAction: c.multiSelectAction,
                readOnly: c.readOnly,
                scrollIntoView: c.scrollIntoView === undefined ? "cursor" : c.scrollIntoView
            });
        }

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
                multiSelectAction: "forEach",
                scrollIntoView: "cursor"
            }, {
                name: "insertstring",
                exec: function(editor, str) {
                    editor.insert(str);
                },
                multiSelectAction: "forEach",
                scrollIntoView: "cursor"
            }, {
                name: "inserttext",
                exec: function(editor, session, args) {
                    editor.insert(lang.stringRepeat(args.text || "", args.times || 1));
                },
                multiSelectAction: "forEach",
                scrollIntoView: "cursor"
            }];

            _.each(keys, function(cmd, name) {
                bindCommand(commands, name, cmd);
            });

            if (mode) {
                _.each(mode.keys, function(cmd, name) {
                    bindCommand(commands, name, cmd);
                });
            }

            return commands;
        }

        register(null, {
            keys: api
        });
    }
});
