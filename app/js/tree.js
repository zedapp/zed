/*global define, $, _ */
define(function(require, exports, module) {
    "use strict";
    plugin.consumes = ["eventbus", "goto", "command", "state", "session_manager", "editor", "config"];
    plugin.provides = ["tree"];
    return plugin;

    function plugin(options, imports, register) {
        var eventbus = imports.eventbus;
        var goto = imports.goto;
        var command = imports.command;
        var session_manager = imports.session_manager;
        var editor = imports.editor;
        var config = imports.config;

        var ignoreActivate = false;
        var treeVisible = false;

        var api = {
            buildDirectoryObject: buildDirectoryObject,
            hook: function() {
                eventbus.on("loadedfilelist", updateTree);
                eventbus.on("newfilecreated", updateTree);
                eventbus.on("filedeleted", updateTree);
                eventbus.on("configchanged", function() {
                    if (config.getPreference("persistentTree")) {
                        treeVisible = true;
                        updateTree();
                    } else {
                        hideTree();
                    }
                });
            }
        };

        eventbus.declare("tree");
        eventbus.declare("commandtree");

        function buildDirectoryObject(list, sep) {
            var root = {};

            function addEntry(path) {
                var parts = path.split(sep);
                if (parts[0] === '') {
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
                if (entry !== true) {
                    elements.push({
                        title: filename,
                        key: fullPath,
                        isFolder: true,
                        children: objToDynaTree(entry, sep, fullPath)
                    });
                }
            });
            _.each(obj, function(entry, filename) {
                var fullPath = path + sep + filename;
                if (fullPath.indexOf("zed::") !== -1) {
                    fullPath = fullPath.substring(1);
                }
                if (entry === true) {
                    elements.push({
                        title: filename,
                        key: fullPath
                    });
                }
            });
            return elements;
        }

        function updateTree() {
            setTimeout(function() {
                if (treeVisible) {
                    $("#file-tree").remove();
                    var edit = editor.getActiveEditor();
                    showTree("file-tree", edit, goto.getFileCache(), "/", session_manager.go, false);
                }
            });
        }

        function hideTree() {
            $("#file-tree").hide();
            if (!zed.services.open_ui) {
                editor.getActiveEditor().focus();
            }
            treeVisible = false;
            $("#editor-wrapper-wrapper").removeClass("left-tree");
            editor.resizeEditors();
        }


        function showTree(treeId, edit, list, sep, onSelect, focus) {
            var editorEl = $(edit.container);
            var treeEl = $("#" + treeId);
            treeVisible = true;

            $("#editor-wrapper-wrapper").addClass("left-tree");
            editor.resizeEditors();

            if (focus) {
                ignoreActivate = true;
            }
            var lastFocusEl = null;

            function cancel() {
                if (!config.getPreference("persistentTree")) {
                    hideTree();
                }
                editor.getActiveEditor().focus();
            }

            function focusTree() {
                if (!focus) {
                    return;
                }
                setTimeout(function() {
                    var tree = treeEl.dynatree("getTree");
                    editor.getActiveEditor().blur();
                    ignoreActivate = true;
                    tree.activateKey(editor.getActiveSession().filename);
                    if (!tree.getActiveNode()) {
                        tree.getRoot().childList[0].focus();
                    }
                    setTimeout(function() {
                        ignoreActivate = false;
                    });
                }, 100);
            }

            if (treeEl.length === 0) {
                $("body").append("<div id='" + treeId + "' class='tree'>");

                treeEl = $("#" + treeId);
                treeEl.dynatree({
                    onActivate: function(node) {
                        if (ignoreActivate) {
                            return;
                        }
                        if (!node.data.isFolder) {
                            cancel();
                            onSelect(node.data.key);
                            editor.getActiveEditor().focus();
                        }
                    },
                    onKeydown: function(node, event) {
                        if (event.keyCode === 27) {
                            cancel();
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
            treeEl.css("top", (editorEl.offset().top - 22) + "px");
        }

        command.define("Navigate:File Tree", {
            doc: "Display the files of the current project in a tree heirarchy.",
            exec: function(edit) {
                eventbus.emit("tree");
                showTree("file-tree", edit, goto.getFileCache(), "/", session_manager.go, true);
            },
            readOnly: true
        });

        register(null, {
            tree: api
        });
    }
});
