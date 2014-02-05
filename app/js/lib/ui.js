/*global define, $, _, ace */
define(function(require, exports, module) {
    "use strict";
    var editor = require("../editor");
    var path = require("./path");
    var keyCode = require("./key_code");
    var eventbus = require("../lib/eventbus");
    var AcePopup = require("ace/autocomplete/popup").AcePopup;

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

        var edit = editor.getActiveEditor();
        $("body").append("<div id='goto'><input type='text' id='gotoinput' placeholder='" + placeholder + "'/><div id='gotohint'></div><div id='results'>");

        var editorEl = $(edit.container);
        var gotoEl = $("#goto");
        var hintEl = $("#gotohint");
        var box = $("#goto");
        var input = $("#gotoinput");

        gotoEl.css("left", (editorEl.offset().left + 40) + "px");
        gotoEl.css("width", (editorEl.width() - 80) + "px");
        gotoEl.css("top", editorEl.offset().top + "px");
        var popup = new AcePopup($("#results")[0]);
        popup.on("click", function(e) {
            select();
            e.stop();
        });
        
        var handleSelect = false;

        popup.on("select", function() {
            if (!handleSelect) {
                return;
            }
            input.val(getCurrentHighlightedItem());
            triggerOnChange();
            updateHint();
        });

        var lastPhrase = null;
        var results = [];

        if (options.text) {
            input.val(options.text);
        }

        input.keyup(function(event) {
            switch (event.keyCode) {
                case keyCode('Esc'):
                    cancel();
                    break;
                case keyCode('Up'):
                    go('up');
                    break;
                case keyCode('Down'):
                    go('down');
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
                        input.val(path.dirname(currentPath) + "/");
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
                        input.val(path.dirname(input.val()) + "/");
                        event.preventDefault();
                    }
                    break;
                case keyCode('Tab'):
                    // Tab
                    if (event.shiftKey) {
                        go('up');
                    } else {
                        go('down');
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
            if (results.length === 0) {
                return null;
            }
            return popup.getData(popup.getRow()).path;
        }

        function go(where) {
            var row = popup.getRow();
            var max = popup.session.getLength() - 1;

            switch (where) {
                case "up":
                    row = row < 0 ? max : row - 1;
                    break;
                case "down":
                    row = row >= max ? -1 : row + 1;
                    break;
                case "start":
                    row = 0;
                    break;
                case "end":
                    row = max;
                    break;
            }

            popup.setRow(row);
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
            popup.hide();
            box.remove();
            editor.getActiveEditor().focus();
        }

        function updateHint() {
            if (hint) {
                hintEl.html(hint(input.val(), results));
            }
        }

        function cancel() {
            onCancel && onCancel();
            close();
        }

        function updateResults() {
            var phrase = input.val();
            results = filter(phrase).slice(0, 500);
            if (results.length > 0) {
                _.each(results, function(result) {
                    result.caption = result.name;
                });
                handleSelect = false;
                if (!popup.isOpen) {
                    popup.show({
                        left: 0,
                        top: 0
                    }, 14);
                    $(popup.container).css("top", 0);
                }
                popup.setData(results);
                handleSelect = true;
            } else {
                popup.hide();
            }
            updateHint();
            lastPhrase = phrase;
        }

    };

    function makeDialog(width, height) {
        var dialogEl = $('<div id="dialog">');
        dialogEl.css("height", height + "px");
        dialogEl.css("margin-top", -Math.round(height / 2) + "px");
        dialogEl.css("width", width + "px");
        dialogEl.css("margin-left", -Math.round(height / 2) + "px");

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

        if (inputText !== undefined) {
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
            switch (event.keyCode) {
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
            callback(null, input ? input.val() : true);
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

    var blockedEl = null;

    exports.blockUI = function(message, noSpin) {
        if (blockedEl) {
            return;
        }
        console.log("Blocking UI");
        blockedEl = $("<div id='blockui'>");
        $("body").append(blockedEl);
        blockedEl.html(message + (!noSpin ? " <img src='img/loader.gif'/>" : ""));
    };

    exports.unblockUI = function() {
        if (blockedEl) {
            console.log("Unblocking UI again");
            blockedEl.fadeOut(function() {
                this.remove();
            });
            blockedEl = null;
        }
    };
});