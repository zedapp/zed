define(function(require, exports, module) {
    var goto = require("goto");
    var command = require("command");
    
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
    
    function htmlEscape(s) {
        return s;
    }
    
    function directoryObjectToUl(obj) {
        var html = '<ul>';
        Object.keys(obj).forEach(function(file) {
            if(obj[file] === true) {
                html += "<li><a>" + htmlEscape(file) + "</a></li>";
            } else {
                html += "<li><a>" + htmlEscape(file) + "</a><ul>" + directoryObjectToUl(obj[file]) + "</ul></li>";
            }
        });
        html += '</ul>';
        return html;
    }
    
    command.define("Goto:Tree", {
        exec: function(edit) {
            $("body").append("<div id='tree'>" + directoryObjectToUl(buildDirectoryObject()));
            
            var editorEl = $(edit.container);
            var treeEl = $("#tree");
            
            treeEl.css("left", (editorEl.offset().left + 40) + "px");
            treeEl.css("width", (editorEl.width() - 80) + "px");
            treeEl.css("top", editorEl.offset().top + "px");
            treeEl.jstree({
                "plugins": ["themes", "html_data", "ui", "crrm", "hotkeys"],
                themes: {
                    theme: "classic",
                    icons: false
                },
                core: {
                    animation: 2
                }
            }).bind("loaded.jstree", function (event, data) {
                console.log("Loaded");
                console.log(jQuery.jstree._reference("tree").set_focus());
            }).focus();
        },
        readOnly: true
    });
    
    
    exports.buildDirectoryObject = buildDirectoryObject;
    exports.directoryObjectToUl = directoryObjectToUl;
});