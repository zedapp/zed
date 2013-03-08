define(function(require, exports, module) {
    "use strict";
    var editor = require("editor");
    
    var visible = false;

    exports.filterBox = function(placeholder, filterCallback, selectCallback) {
        if(visible)
            return;
        var edit = editor.getActiveEditor();
        $("body").append("<div id='goto'><input type='text' id='gotoinput' placeholder='" + placeholder + "'/><ul id='results'>");
        
        var editorEl = $(edit.container);
        var gotoEl = $("#goto");
        
        gotoEl.css("left", (editorEl.offset().left + 40) + "px");
        gotoEl.css("width", (editorEl.width() - 80) + "px");
        gotoEl.css("top", editorEl.offset().top + "px");
        
        visible = true;

        var box = $("#goto");
        var input = $("#gotoinput");
        var resultsEl = $("#results");
        var lastPhrase = null;
        var results = [];
        
        var ignoreFocus = false;
        
        resultsEl.menu({
            select: select,
            focus: function(event, ui) {
                if(ignoreFocus) {
                    ignoreFocus = false;
                    return;
                }

                input.val(ui.item.text());
            }
        });
        
        function select(event) {
            var selection = input.val();
            var selectedPath = resultsEl.find("a.ui-state-focus").text();
            close();
            if(selection) {
                if(selection[0] !== '/' && selection.indexOf("zed:") !== 0)
                    selection = selectedPath;
                selectCallback(selection);
            } else {
                // By default pick the item at the top of the list
                if(selectedPath)
                    selectCallback(selectedPath);
            }
            event && event.preventDefault();
        }

        function close() {
            resultsEl.menu("destroy");
            box.remove();
            editor.getActiveEditor().focus();
            visible = false;
        }
        
        function updateResults() {
            var phrase = input.val();
            results = filterCallback(phrase).slice(0, 100);
            resultsEl.empty();
            results.forEach(function(r, idx) {
                resultsEl.append('<li><a href="#">' + r.path + '</a></li>');
            });
            resultsEl.menu("refresh");
            if(phrase[0] !== '/') {
                ignoreFocus = true;
                resultsEl.menu("next");
            }
            lastPhrase = phrase;
        }
        
        input.keyup(function(event) {
            //console.log(event);
            switch(event.keyCode) {
                case 27: // esc
                    close();
                    break;
                case 38: // up
                    resultsEl.menu("previous");
                    break;
                case 40: // down
                    resultsEl.menu("next");
                    break;
                case 13: // enter
                    select();
                    break;
                case 9: // tab
                    break;
                    // explicit non-break
                default:
                    // TODO only update on textual characters
                    if(lastPhrase != input.val()) {
                        updateResults();
                    }
            }
        });
        input.keydown(function(event) {
            switch(event.keyCode) {
                case 32: // space
                    var phrase = input.val();
                    if(phrase)
                        break;
                    var session = editor.getActiveSession();
                    if(session.filename) {
                        input.val(io.dirname(session.filename) + "/");
                        event.preventDefault();
                    }
                    break;
                case 8: // backspace
                    var val = input.val();
                    var caret = input.caret();
                    if(val === '/') {
                        input.val('');
                    } else if(val[caret.start-1] === '/') {
                        input.val(io.dirname(input.val()) + "/");
                        event.preventDefault();
                    }
                    break;
                case 9: // Tab
                    if(event.shiftKey)
                        resultsEl.menu("previous");
                    else
                        resultsEl.menu("next");
                    event.preventDefault();
                    event.stopPropagation();
                    break;
            }
        });
        input.focus();
        updateResults();
    }
});