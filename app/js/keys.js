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
        commands.push({
            name: cmd,
            bindKey: bindKey,
            exec: function(editor) {
                return command.exec(cmd, editor);
            },
            readOnly: true //command.lookup(cmd).readOnly
        });
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
        settingsfs.watchFile("/keys.user.json", loadKeys);
    };
    
    var oldOnCommandKey = null;
    var oldOnTextInput = null;
    exports.tempRebindKeys = function(keyHandler) {
        var edit = editor.getActiveEditor();
        if(oldOnCommandKey) {
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
        if(oldOnCommandKey) {
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
            } catch(e) {}
        });
    }
    
    loadCommands();
    
    function loadCommands() {
        // TODO: Move these into keys.json
        commands = [{
            name: "fold",
            bindKey: bindKey("Alt-L|Ctrl-F1", "Command-Alt-L|Command-F1"),
            exec: function(editor) {
                editor.session.toggleFold(false);
            },
            readOnly: true
        }, {
            name: "unfold",
            bindKey: bindKey("Alt-Shift-L|Ctrl-Shift-F1", "Command-Alt-Shift-L|Command-Shift-F1"),
            exec: function(editor) {
                editor.session.toggleFold(true);
            },
            readOnly: true
        }, {
            name: "foldall",
            bindKey: bindKey("Alt-0", "Command-Option-0"),
            exec: function(editor) {
                editor.session.foldAll();
            },
            readOnly: true
        }, {
            name: "unfoldall",
            bindKey: bindKey("Alt-Shift-0", "Command-Option-Shift-0"),
            exec: function(editor) {
                editor.session.unfold();
            },
            readOnly: true
        }, {
            name: "findnext",
            bindKey: bindKey("Ctrl-K", "Command-G"),
            exec: function(editor) {
                editor.findNext();
            },
            readOnly: true
        }, {
            name: "findprevious",
            bindKey: bindKey("Ctrl-Shift-K", "Command-Shift-G"),
            exec: function(editor) {
                editor.findPrevious();
            },
            readOnly: true
        }, {
            name: "overwrite",
            bindKey: "Insert",
            exec: function(editor) {
                editor.toggleOverwrite();
            },
            readOnly: true
        }, {
            name: "selecttostart",
            bindKey: bindKey("Ctrl-Shift-Home", "Command-Shift-Up"),
            exec: function(editor) {
                editor.getSelection().selectFileStart();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "gotostart",
            bindKey: bindKey("Ctrl-Home", "Command-Home|Command-Up"),
            exec: function(editor) {
                editor.navigateFileStart();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "selectup",
            bindKey: bindKey("Shift-Up", "Shift-Up"),
            exec: function(editor) {
                editor.getSelection().selectUp();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "golineup",
            bindKey: bindKey("Up", "Up|Ctrl-P"),
            exec: function(editor, args) {
                editor.navigateUp(args.times);
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "selecttoend",
            bindKey: bindKey("Ctrl-Shift-End", "Command-Shift-Down"),
            exec: function(editor) {
                editor.getSelection().selectFileEnd();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "gotoend",
            bindKey: bindKey("Ctrl-End", "Command-End|Command-Down"),
            exec: function(editor) {
                editor.navigateFileEnd();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "selectdown",
            bindKey: bindKey("Shift-Down", "Shift-Down"),
            exec: function(editor) {
                editor.getSelection().selectDown();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "golinedown",
            bindKey: bindKey("Down", "Down|Ctrl-N"),
            exec: function(editor, args) {
                editor.navigateDown(args.times);
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "selectwordleft",
            bindKey: bindKey("Ctrl-Shift-Left", "Option-Shift-Left"),
            exec: function(editor) {
                editor.getSelection().selectWordLeft();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "gotowordleft",
            bindKey: bindKey("Ctrl-Left", "Option-Left"),
            exec: function(editor) {
                editor.navigateWordLeft();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "selecttolinestart",
            bindKey: bindKey("Alt-Shift-Left", "Command-Shift-Left"),
            exec: function(editor) {
                editor.getSelection().selectLineStart();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "gotolinestart",
            bindKey: bindKey("Alt-Left|Home", "Command-Left|Home|Ctrl-A"),
            exec: function(editor) {
                editor.navigateLineStart();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "selectleft",
            bindKey: bindKey("Shift-Left", "Shift-Left"),
            exec: function(editor) {
                editor.getSelection().selectLeft();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "gotoleft",
            bindKey: bindKey("Left", "Left|Ctrl-B"),
            exec: function(editor, args) {
                editor.navigateLeft(args.times);
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "selectwordright",
            bindKey: bindKey("Ctrl-Shift-Right", "Option-Shift-Right"),
            exec: function(editor) {
                editor.getSelection().selectWordRight();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "gotowordright",
            bindKey: bindKey("Ctrl-Right", "Option-Right"),
            exec: function(editor) {
                editor.navigateWordRight();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "selecttolineend",
            bindKey: bindKey("Alt-Shift-Right", "Command-Shift-Right"),
            exec: function(editor) {
                editor.getSelection().selectLineEnd();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "gotolineend",
            bindKey: bindKey("Alt-Right|End", "Command-Right|End|Ctrl-E"),
            exec: function(editor) {
                editor.navigateLineEnd();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "selectright",
            bindKey: bindKey("Shift-Right", "Shift-Right"),
            exec: function(editor) {
                editor.getSelection().selectRight();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "gotoright",
            bindKey: bindKey("Right", "Right|Ctrl-F"),
            exec: function(editor, args) {
                editor.navigateRight(args.times);
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "selectpagedown",
            bindKey: "Shift-PageDown",
            exec: function(editor) {
                editor.selectPageDown();
            },
            readOnly: true
        }, {
            name: "pagedown",
            bindKey: bindKey(null, "Option-PageDown"),
            exec: function(editor) {
                editor.scrollPageDown();
            },
            readOnly: true
        }, {
            name: "gotopagedown",
            bindKey: bindKey("PageDown", "PageDown|Ctrl-V"),
            exec: function(editor) {
                editor.gotoPageDown();
            },
            readOnly: true
        }, {
            name: "selectpageup",
            bindKey: "Shift-PageUp",
            exec: function(editor) {
                editor.selectPageUp();
            },
            readOnly: true
        }, {
            name: "pageup",
            bindKey: bindKey(null, "Option-PageUp"),
            exec: function(editor) {
                editor.scrollPageUp();
            },
            readOnly: true
        }, {
            name: "gotopageup",
            bindKey: bindKey("PageUp", "PageUp|Alt-V"),
            exec: function(editor) {
                editor.gotoPageUp();
            },
            readOnly: true
        }, {
            name: "scrollup",
            bindKey: bindKey("Ctrl-Up", null),
            exec: function(e) {
                e.renderer.scrollBy(0, -2 * e.renderer.layerConfig.lineHeight);
            },
            readOnly: true
        }, {
            name: "scrolldown",
            bindKey: bindKey("Ctrl-Down", null),
            exec: function(e) {
                e.renderer.scrollBy(0, 2 * e.renderer.layerConfig.lineHeight);
            },
            readOnly: true
        }, {
            name: "selectlinestart",
            bindKey: "Shift-Home",
            exec: function(editor) {
                editor.getSelection().selectLineStart();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "selectlineend",
            bindKey: "Shift-End",
            exec: function(editor) {
                editor.getSelection().selectLineEnd();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "togglerecording",
            bindKey: bindKey("Ctrl-Alt-E", "Command-Option-E"),
            exec: function(editor) {
                editor.commands.toggleRecording(editor);
            },
            readOnly: true
        }, {
            name: "replaymacro",
            bindKey: bindKey("Ctrl-Shift-E", "Command-Shift-E"),
            exec: function(editor) {
                editor.commands.replay(editor);
            },
            readOnly: true
        }, {
            name: "jumptomatching",
            bindKey: bindKey("Ctrl-P", "Ctrl-Shift-P"),
            exec: function(editor) {
                editor.jumpToMatching();
            },
            multiSelectAction: "forEach",
            readOnly: true
        }, {
            name: "selecttomatching",
            bindKey: bindKey("Ctrl-Shift-P", null),
            exec: function(editor) {
                editor.jumpToMatching(true);
            },
            readOnly: true
        },
    
        // commands disabled in readOnly mode
        {
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
            name: "removeline",
            bindKey: bindKey("Ctrl-D", "Command-D"),
            exec: function(editor) {
                editor.removeLines();
            },
            multiSelectAction: "forEach"
        }, {
            name: "duplicateSelection",
            bindKey: bindKey("Ctrl-Shift-D", "Command-Shift-D"),
            exec: function(editor) {
                editor.duplicateSelection();
            },
            multiSelectAction: "forEach"
        }, {
            name: "sortlines",
            bindKey: bindKey("Ctrl-Alt-S", "Command-Alt-S"),
            exec: function(editor) {
                editor.sortLines();
            },
            multiSelectAction: "forEach"
        }, {
            name: "togglecomment",
            bindKey: bindKey("Ctrl-/", "Command-/"),
            exec: function(editor) {
                editor.toggleCommentLines();
            },
            multiSelectAction: "forEach"
        }, {
            name: "modifyNumberUp",
            bindKey: bindKey("Ctrl-Shift-Up", "Alt-Shift-Up"),
            exec: function(editor) {
                editor.modifyNumber(1);
            },
            multiSelectAction: "forEach"
        }, {
            name: "modifyNumberDown",
            bindKey: bindKey("Ctrl-Shift-Down", "Alt-Shift-Down"),
            exec: function(editor) {
                editor.modifyNumber(-1);
            },
            multiSelectAction: "forEach"
        }, {
            name: "undo",
            bindKey: bindKey("Ctrl-Z", "Command-Z"),
            exec: function(editor) {
                editor.undo();
            }
        }, {
            name: "redo",
            bindKey: bindKey("Ctrl-Shift-Z|Ctrl-Y", "Command-Shift-Z|Command-Y"),
            exec: function(editor) {
                editor.redo();
            }
        }, {
            name: "copylinesup",
            bindKey: bindKey("Alt-Shift-Up", "Command-Option-Up"),
            exec: function(editor) {
                editor.copyLinesUp();
            }
        }, {
            name: "movelinesup",
            bindKey: bindKey("Alt-Up", "Option-Up"),
            exec: function(editor) {
                editor.moveLinesUp();
            }
        }, {
            name: "copylinesdown",
            bindKey: bindKey("Alt-Shift-Down", "Command-Option-Down"),
            exec: function(editor) {
                editor.copyLinesDown();
            }
        }, {
            name: "movelinesdown",
            bindKey: bindKey("Alt-Down", "Option-Down"),
            exec: function(editor) {
                editor.moveLinesDown();
            }
        }, {
            name: "del",
            bindKey: bindKey("Delete", "Delete|Ctrl-D"),
            exec: function(editor) {
                editor.remove("right");
            },
            multiSelectAction: "forEach"
        }, {
            name: "backspace",
            bindKey: bindKey(
                "Shift-Backspace|Backspace",
                "Shift-Backspace|Backspace|Ctrl-H"),
            exec: function(editor) {
                editor.remove("left");
            },
            multiSelectAction: "forEach"
        }, {
            name: "removetolinestart",
            bindKey: bindKey("Alt-Backspace", "Command-Backspace"),
            exec: function(editor) {
                editor.removeToLineStart();
            },
            multiSelectAction: "forEach"
        }, {
            name: "removetolineend",
            bindKey: bindKey("Alt-Delete", "Ctrl-K"),
            exec: function(editor) {
                editor.removeToLineEnd();
            },
            multiSelectAction: "forEach"
        }, {
            name: "removewordleft",
            bindKey: bindKey("Ctrl-Backspace", "Alt-Backspace|Ctrl-Alt-Backspace"),
            exec: function(editor) {
                editor.removeWordLeft();
            },
            multiSelectAction: "forEach"
        }, {
            name: "removewordright",
            bindKey: bindKey("Ctrl-Delete", "Alt-Delete"),
            exec: function(editor) {
                editor.removeWordRight();
            },
            multiSelectAction: "forEach"
        }, {
            name: "outdent",
            bindKey: bindKey("Shift-Tab", "Shift-Tab"),
            exec: function(editor) {
                editor.blockOutdent();
            },
            multiSelectAction: "forEach"
        }, {
            name: "indent",
            bindKey: bindKey("Tab", "Tab"),
            exec: function(editor) {
                editor.indent();
            },
            multiSelectAction: "forEach"
        }, {
            name: "blockoutdent",
            bindKey: bindKey("Ctrl-[", "Ctrl-["),
            exec: function(editor) {
                editor.blockOutdent();
            },
            multiSelectAction: "forEach"
        }, {
            name: "blockindent",
            bindKey: bindKey("Ctrl-]", "Ctrl-]"),
            exec: function(editor) {
                editor.blockIndent();
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
        }, {
            name: "splitline",
            bindKey: "Ctrl-O",
            exec: function(editor) {
                editor.splitLine();
            },
            multiSelectAction: "forEach"
        }, {
            name: "transposeletters",
            bindKey: bindKey("Ctrl-T", "Ctrl-T"),
            exec: function(editor) {
                editor.transposeLetters();
            },
            multiSelectAction: function(editor) {
                editor.transposeSelections(1);
            }
        }, {
            name: "touppercase",
            bindKey: bindKey("Ctrl-U", "Ctrl-U"),
            exec: function(editor) {
                editor.toUpperCase();
            },
            multiSelectAction: "forEach"
        }, {
            name: "tolowercase",
            bindKey: bindKey("Ctrl-Shift-U", "Ctrl-Shift-U"),
            exec: function(editor) {
                editor.toLowerCase();
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
