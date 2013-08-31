/*global define $*/
define(function(require, exports, module) {
    "use strict";
    var eventbus = require("./lib/eventbus");
    var goto = require("./goto");
    var command = require("./command");
    var session_manager = require("./session_manager");
    var editor = require("./editor");
    
    function buildDirectoryObject() {
        var fileList = goto.getFileCache();
        
        var root = {};
        
        function addEntry(path) {
            var parts = path.split('/');
            parts.shift();
            var currentDir = root;
            for(var i = 0; i < parts.length - 1; i++) {
                var p = parts[i];
                if(!currentDir[p]) {
                    currentDir[p] = {};
                }
                currentDir = currentDir[p];
            }
            var lastPart = parts[parts.length-1];
            currentDir[lastPart] = true;
        }
        
        for(var i = 0; i < fileList.length; i++) {
            addEntry(fileList[i]);
        }
        
        return root;
    }
    
    function objToDynaTree(obj, path) {
        var elements = [];
        Object.keys(obj).forEach(function(filename) {
            var entry = obj[filename];
            var fullPath = path + '/' + filename;
            if(entry === true) {
                elements.push({
                    title: filename,
                    key: fullPath
                });
            } else {
                elements.push({
                    title: filename,
                    key: fullPath,
                    isFolder: true,
                    children: objToDynaTree(entry, fullPath)
                });
            }
        });
        return elements;
    }
    
    var treeEl = null;
    var ignoreActivate = true;
    var lastFocusEl = null;
    
    function close() {
        treeEl.hide();
        editor.getActiveEditor().focus();
    }
    
    function focusTree() {
        setTimeout(function() {
            editor.getActiveEditor().blur();
            var tree = $("#tree").dynatree("getTree");
            ignoreActivate = true;
            tree.activateKey(editor.getActiveSession().filename);
            if(!tree.getActiveNode()) {
                $(lastFocusEl ? lastFocusEl.li : "#tree li:first").focus().click();
            }
            ignoreActivate = false;
        }, 100);
    }
    
    exports.hook = function() {
        eventbus.on("loadedfilelist", function() {
            if(treeEl) {
                treeEl.remove();
                treeEl = null;
            }
        });
    };
    
    command.define("Goto:Tree", {
        exec: function(edit) {
            var editorEl = $(edit.container);
            if(!treeEl) {
                $("body").append("<div id='tree'>");
                
                treeEl = $("#tree");
                treeEl.dynatree({
                    onActivate: function(node) {
                        console.log("On activate", node, ignoreActivate);
                        if(ignoreActivate) {
                            return;
                        }
                        if(!node.data.isFolder) {
                            close();
                            session_manager.go(node.data.key);
                            editor.getActiveEditor().focus();
                        }
                    },
                    onKeydown: function(node, event) {
                        if(event.keyCode === 27) {
                            close();
                        }
                    },
                    onFocus: function(node) {
                        lastFocusEl = node;
                        window.node = node;
                    },
                    keyboard: true,
                    autoFocus: true,
                    debugLevel: 0,
                    children: objToDynaTree(buildDirectoryObject(), "")
                });
                focusTree();
            } else {
                treeEl.show();
                focusTree();
            }
            treeEl.css("left", (editorEl.offset().left + 40) + "px");
            treeEl.css("width", (editorEl.width() - 80) + "px");
            treeEl.css("top", editorEl.offset().top + "px");
        },
        readOnly: true
    });
    
    exports.buildDirectoryObject = buildDirectoryObject;
});
