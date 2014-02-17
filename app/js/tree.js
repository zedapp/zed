/*global define, $, _ */
define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./lib/eventbus");
    var goto = require("./goto");
    var command = require("./command");
    var state = require("./state");
    var session_manager = require("./session_manager");
    var editor = require("./editor");

    function buildDirectoryObject(list, sep) {
        var root = {};

        function addEntry(path) {
            var parts = path.split(sep);
            if(parts[0] === '') {
                parts.shift();
            }
            var currentDir = root;
            for (var i = 0; i < parts.length - 1; i++) {
                var p = parts[i];
                if (!currentDir[p]) {
                    currentDir[p] = {};
                }
                currentDir = currentDir[p];
            }
            var lastPart = parts[parts.length - 1];
            currentDir[lastPart] = true;
        }

        for (var i = 0; i < list.length; i++) {
            addEntry(list[i]);
        }

        return root;
    }

    function objToDynaTree(obj, sep, path) {
        var elements = [];
        _.each(obj, function(entry, filename) {
            var fullPath = path + sep + filename;
            if (entry === true) {
                elements.push({
                    title: filename,
                    key: fullPath
                });
            } else {
                elements.push({
                    title: filename,
                    key: fullPath,
                    isFolder: true,
                    children: objToDynaTree(entry, sep, fullPath)
                });
            }
        });
        return elements;
    }

    exports.hook = function() {
        eventbus.on("loadedfilelist", function() {
            $("#file-tree").remove();
        });
    };
    
    var ignoreActivate = true;
    function showTree(treeId, edit, list, sep, onSelect) {
        var editorEl = $(edit.container);
        var treeEl = $("#" + treeId);
        
        ignoreActivate = true;
        var lastFocusEl = null;

        function close() {
            treeEl.hide();
            editor.getActiveEditor().focus();
        }
        
        function focusTree() {
            setTimeout(function() {
                editor.getActiveEditor().blur();
                var tree = treeEl.dynatree("getTree");
                ignoreActivate = true;
                tree.activateKey(editor.getActiveSession().filename);
                if (!tree.getActiveNode()) {
                    $(lastFocusEl ? lastFocusEl.li : "#" + treeId +" li:first").focus().click();
                }
                setTimeout(function() {
                    ignoreActivate = false;
                });
            }, 100);
        }
        
        
        if(treeEl.length === 0) {
            $("body").append("<div id='" + treeId + "' class='tree'>");

            treeEl = $("#" + treeId);
            treeEl.dynatree({
                onActivate: function(node) {
                    if (ignoreActivate) {
                        return;
                    }
                    if (!node.data.isFolder) {
                        close();
                        onSelect(node.data.key);
                        editor.getActiveEditor().focus();
                    }
                },
                onKeydown: function(node, event) {
                    if (event.keyCode === 27) {
                        close();
                    }
                },
                onFocus: function(node) {
                    lastFocusEl = node;
                },
                keyboard: true,
                autoFocus: true,
                debugLevel: 0,
                children: objToDynaTree(buildDirectoryObject(list.slice().sort(), sep), sep, "")
            });
            focusTree();
        } else {
            treeEl.show();
            focusTree();
        }
        treeEl.css("left", (editorEl.offset().left + 40) + "px");
        treeEl.css("width", (editorEl.width() - 80) + "px");
        treeEl.css("top", editorEl.offset().top + "px");
    }

    command.define("Navigate:File Tree", {
        exec: function(edit) {
            showTree("file-tree", edit, goto.getFileCache(), "/", session_manager.go);
        },
        readOnly: true
    });
    
    command.define("Command:Command Tree", {
        exec: function(edit) {
            showTree("command-tree", edit, command.allCommands().sort(), ":", function(cmd) {
                console.log("Selected somethign!", cmd);
                cmd = cmd.substring(1); // Strip leading ':'
                var recentCommands = state.get("recent.commands") || {};
                recentCommands[cmd] = Date.now();
                state.set("recent.commands", recentCommands);
                command.exec(cmd, edit, edit.getSession());
            });
        },
        readOnly: true
    });

    exports.buildDirectoryObject = buildDirectoryObject;
});