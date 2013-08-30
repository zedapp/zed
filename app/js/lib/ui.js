/*global define $ _*/
define(function(require, exports, module) {
    "use strict";
    var editor = require("../editor");
    var project = require("../project");
    var keyCode = require("./key_code");
    var eventbus = require("../lib/eventbus");

    var visible = false;

    /**
     * Supported options
     * - placeholder
     * - text (initial text in input)
     * - currentPath
     * - filter (function)
     * - hint (function)
     * - onSelect (function)
     * - onCancel (function)
     */
    // TODO: Clean up this mess
    exports.filterBox = function(options) {
        var placeholder = options.placeholder || "";
        var filter = options.filter;
        var onSelect = options.onSelect;
        var onChange = options.onChange;
        var onCancel = options.onCancel;
        var hint = options.hint;
        var currentPath = options.currentPath;
        
        if (visible) {
            return;
        }
        
        var edit = editor.getActiveEditor();
        $("body").append("<div id='goto'><input type='text' id='gotoinput' placeholder='" + placeholder + "'/><div id='gotohint'></div><ul id='results'>");

        var editorEl = $(edit.container);
        var gotoEl = $("#goto");
        var hintEl = $("#gotohint");
        var box = $("#goto");
        var input = $("#gotoinput");
        var resultsEl = $("#results");
        
        if(options.text) {
            input.val(options.text);
        }
        
        gotoEl.css("left", (editorEl.offset().left + 40) + "px");
        gotoEl.css("width", (editorEl.width() - 80) + "px");
        gotoEl.css("top", editorEl.offset().top + "px");

        visible = true;

        var lastPhrase = null;
        var results = [];

        var ignoreFocus = false;
        
        resultsEl.menu({
            select: select,
            focus: function(event, ui) {
                if (ignoreFocus) {
                    ignoreFocus = false;
                    return;
                }
                input.val(ui.item.data("path"));
                triggerOnChange();
                updateHint();
            }
        });
        
        input.keyup(function(event) {
            switch (event.keyCode) {
                case keyCode('Esc'):
                    cancel();
                    break;
                case keyCode('Up'):
                    resultsEl.menu("previous");
                    break;
                case keyCode('Down'):
                    resultsEl.menu("next");
                    break;
                case keyCode('Return'):
                    select();
                    break;
                case keyCode('Tab'):
                    break;
                default:
                    if (lastPhrase != input.val()) {
                        updateResults();
                        triggerOnChange();
                    }
            }
        });
        input.keydown(function(event) {
            switch (event.keyCode) {
                case keyCode('Space'):
                    var phrase = input.val();
                    if (phrase) {
                        break;
                    }
                    if (currentPath) {
                        input.val(project.dirname(currentPath) + "/");
                        event.preventDefault();
                    }
                    break;
                case keyCode('Backspace'):
                    // backspace
                    var val = input.val();
                    var caret = input.caret();
                    if (val === '/') {
                        input.val('');
                    } else if (val[caret.start - 1] === '/') {
                        input.val(project.dirname(input.val()) + "/");
                        event.preventDefault();
                    }
                    break;
                case keyCode('Tab'):
                    // Tab
                    if (event.shiftKey) {
                        resultsEl.menu("previous");
                    } else {
                        resultsEl.menu("next");
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    break;
            }
        });
        input.focus();
        updateResults();
        triggerOnChange();
        eventbus.on("splitswitched", cancel);
        
        
        function triggerOnChange() {
            onChange && onChange(input.val(), getCurrentHighlightedItem());
        }
        
        function getCurrentHighlightedItem() {
            return resultsEl.find("a.ui-state-focus").parent().data("path");
        }

        function select(event) {
            var inputVal = input.val();
            var selection = inputVal;
            var selectedPath = getCurrentHighlightedItem();
            close();
            if (selection) {
                if (selection[0] !== '/' && selection.indexOf("zed:") !== 0 && selectedPath) {
                    selection = selectedPath;
                }
                onSelect(selection, inputVal);
            } else {
                // By default pick the item at the top of the list
                if (selectedPath) {
                    onSelect(selectedPath, inputVal);
                } else {
                    onCancel && onCancel();
                }
            }
            event && event.preventDefault();
        }

        function close() {
            eventbus.removeListener("splitswitched", cancel);
            resultsEl.menu("destroy");
            box.remove();
            editor.getActiveEditor().focus();
            visible = false;
        }
        
        function updateHint() {
            if(hint) {
                hintEl.html(hint(input.val(), results));
            }
        }
        
        function cancel() {
            onCancel && onCancel();
            close();
        }

        function updateResults() {
            var phrase = input.val();
            results = filter(phrase).slice(0, 100);
            var html = '';
            results.forEach(function(r) {
                var meta = r.meta ? '<span class="meta">' + r.meta + '</meta>' : '';
                html += '<li data-path="' + _.escape(r.path) + '"><a href="#">' + r.name + '</a>' + meta + '</li>';
            });
            resultsEl.html(html);
            resultsEl.menu("refresh");
            if (phrase[0] !== '/') {
                ignoreFocus = true;
                if (results.length > 0) {
                    resultsEl.menu("next");
                }
            }
            updateHint();
            lastPhrase = phrase;
        }
    };
    
    function makeDialog(width, height) {
        var dialogEl = $('<div id="dialog">');
        dialogEl.css("height", height + "px");
        dialogEl.css("margin-top", -Math.round(height/2) + "px");
        dialogEl.css("width", width + "px");
        dialogEl.css("margin-left", -Math.round(height/2) + "px");
        
        $("body").append(dialogEl);
        return dialogEl;
    }
    
    /**
     * Options
     * - width
     * - height
     * - message
     * - input (if left undefined there's no input element)
     */
    exports.prompt = function(options, callback) {
        var message = options.message || "";
        var inputText = options.input;
        var input;
        
        var dialogEl = makeDialog(options.width || 300, options.height || 100);
        dialogEl.html("<div>" + _.escape(message) + "</div>");
        var okButton = $("<button>OK</button>");
        var cancelButton = $("<button>Cancel</button>");
        
        okButton.click(ok);
        cancelButton.click(cancel);
        
        var buttonWrapEl = $("<div class='buttons'>");
        buttonWrapEl.append(okButton);
        buttonWrapEl.append(cancelButton);
        
        if(inputText !== undefined) {
            input = $("<input type='text'>");
            input.val(inputText);
            dialogEl.append(input);
            input.focus();
        }
        
        dialogEl.append(buttonWrapEl);

        editor.getActiveEditor().blur();
        dialogEl.focus();
        $("body").bind("keyup", keyHandler);
        
        function keyHandler(event) {
            switch(event.keyCode) {
                case keyCode('Return'):
                    ok();
                    break;
                case keyCode('Esc'):
                    cancel();
                    break;
            }
        }
        
        function ok() {
            close();
            callback(input ? input.val() : true);
        }
        
        function cancel() {
            close();
            callback();
        }
        
        function close() {
            dialogEl.remove();
            editor.getActiveEditor().focus();
            $("body").unbind("keyup", keyHandler);
        }
    };
});