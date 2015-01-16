/*global define, $, _, ace */
define(function(require, exports, module) {
    "use strict";
    plugin.consumes = ["eventbus"];
    plugin.provides = ["ui"];
    return plugin;

    function plugin(options, imports, register) {
        var AcePopup = require("./lib/ace_popup").AcePopup;
        // var AcePopup = require("ace/autocomplete/popup").AcePopup;
        var path = require("./lib/path");
        var keyCode = require("./lib/key_code");

        var eventbus = imports.eventbus;

        var blockedEl = null;
        var webviewEl = null;

        var api = {
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
            filterBox: function(options) {
                var editor = zed.getService("editor");
                var placeholder = options.placeholder || "";
                var filter = options.filter;
                var onSelect = function(selection, inputVal) {
                    setTimeout(function() {
                        options.onSelect(selection, inputVal);
                    });
                };
                var onChange = options.onChange;
                var onCancel = options.onCancel || function() {};
                var hint = options.hint;
                var currentPath = options.currentPath;

                var edit = editor.getActiveEditor();
                var editorWrapperEl = $("#editor-wrapper");
                editorWrapperEl.append("<div id='goto'><input type='text' id='gotoinput' spellcheck='false' autocomplete='off' placeholder='" + placeholder + "'/><div id='gotohint'></div><div id='results'>");

                var editorEl = $(edit.container);
                var gotoEl = $("#goto");
                var hintEl = $("#gotohint");
                var box = $("#goto");
                var input = $("#gotoinput");

                gotoEl.css("left", (editorEl.offset().left - editorWrapperEl.offset().left + 40) + "px");
                gotoEl.css("width", (editorEl.width() - 80) + "px");
                var popup = new AcePopup($("#results")[0]);
                popup.on("click", function(e) {
                    select();
                    e.stop();
                });
                // Initialize with some dummy data (works around an ACE bug)
                popup.setData([{
                    name: "1"
                }, {
                    name: "2"
                }, {
                    name: "3"
                }]);

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

                var ignoreKeyup = false;

                input.keyup(function(event) {
                    if (ignoreKeyup) {
                        ignoreKeyup = false;
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                    if (event.keyCode === keyCode('Return')) {
                        select();
                    } else if (lastPhrase != input.val()) {
                        updateResults().then(triggerOnChange);
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
                        case keyCode('Tab'):
                            // Tab
                            if (event.shiftKey) {
                                go('up');
                            } else {
                                doTab();
                            }
                            event.preventDefault();
                            event.stopPropagation();
                            ignoreKeyup = true;
                            break;
                        case keyCode('Esc'):
                            cancel();
                            break;
                        case keyCode('Up'):
                            go('up');
                            ignoreKeyup = true;
                            break;
                        case keyCode('Down'):
                            go('down');
                            ignoreKeyup = true;
                            break;
                        case keyCode('PgUp'):
                            for (var i = 0; i < 10; i++) {
                                go('up');
                            }
                            ignoreKeyup = true;
                            break;
                        case keyCode('PgDown'):
                            for (var i = 0; i < 10; i++) {
                                go('down');
                            }
                            ignoreKeyup = true;
                            break;
                        case keyCode('Home'):
                        case keyCode('End'):
                            ignoreKeyup = true;
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
                    }
                });
                input.focus();
                updateResults().then(triggerOnChange);
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
                            row = Math.max(0, row - 1);
                            break;
                        case "down":
                            row = Math.min(max, row + 1);
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
                        if (selection[0] !== '/' && selectedPath) {
                            selection = selectedPath;
                        }
                        onSelect(selection, inputVal);
                    } else {
                        // By default pick the item at the top of the list
                        if (selectedPath) {
                            onSelect(selectedPath, inputVal);
                        } else {
                            onCancel();
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
                    onCancel();
                    close();
                }

                function updateResults() {
                    var phrase = input.val();
                    return filter(phrase).then(function(results_) {
                        results = results_.slice(0, 500);
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
                            window.results = results;
                            popup.setData(results);
                            handleSelect = true;
                        } else {
                            popup.hide();
                        }
                        updateHint();
                        lastPhrase = phrase;
                    });
                }
                window.popup = popup;

                function doTab() {
                    var phrase = input.val();
                    if (phrase[0] === "/") {
                        // We're going to attempt to complete the next path component
                        // here.
                        var phraseParts = phrase.split("/");
                        for (var i = 0; i < results.length; i++) {
                            var result = results[i];
                            // If the prefix doesn't match: not interested
                            if (result.path.indexOf(phrase) !== 0) {
                                continue;
                            }
                            var parts = results[i].path.split("/");
                            // If the path has 1+ more path components
                            if (phraseParts.length < parts.length) {
                                input.val(phraseParts.slice(0, -1).join("/") + "/" + parts[phraseParts.length - 1] + "/");
                                updateResults();
                                return;
                            }
                        }
                        // No match? Just go down one, as usual
                        go("down");
                    } else {
                        go("down");
                    }
                }

            },
            /**
             * Options
             * - width
             * - height
             * - message
             * - input (if left undefined there's no input element)
             */
            prompt: function(options) {
                var editor = zed.getService("editor");
                var message = options.message || "";
                var inputText = options.input;
                var input;

                var dialogEl = makeDialog(options.width || 300, options.height || 100);
                dialogEl.html("<div>" + _.escape(message) + "</div>");
                var okButton = $("<button>OK</button>");
                var cancelButton = $("<button>Cancel</button>");

                return new Promise(function(resolve) {
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
                        input.select();
                    }

                    dialogEl.append(buttonWrapEl);

                    editor.getActiveEditor().blur();
                    dialogEl.focus();
                    setTimeout(function() {
                        $("body").bind("keyup", keyHandler);
                    }, 100);

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
                        resolve(input ? input.val() : true);
                    }

                    function cancel() {
                        close();
                        resolve();
                    }

                    function close() {
                        dialogEl.remove();
                        editor.getActiveEditor().focus();
                        $("body").unbind("keyup", keyHandler);
                    }
                });

            },
            blockUI: function(message, noSpin) {
                $("#blockui").remove();
                blockedEl = $("<div id='blockui'>");
                $("body").append(blockedEl);
                blockedEl.html(message + (!noSpin ? " <img src='/Icon.png' id='wait-logo'/>" : ""));
            },
            unblockUI: function() {
                $("#blockui").remove();
            },
            showWebview: function(url) {
                if (webviewEl) {
                    webviewEl.remove();
                }
                if (window.isNodeWebkit) {
                    webviewEl = $("<div class='webview-wrapper'><iframe nwdisable nwfaketop class='webview'>");
                } else {
                    webviewEl = $("<div class='webview-wrapper'><webview class='webview'>");
                }
                webviewEl.find(".webview").attr("src", url);
                $("#editor-wrapper").append(webviewEl);
                webviewEl.find(".webview")[0].addEventListener("loadstop", function() {
                    webviewEl.find(".webview").focus();
                });
            },
            hideWebview: function() {
                if (webviewEl) {
                    webviewEl.remove();
                    zed.getService("editor").getActiveEditor().focus();
                }
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

        register(null, {
            ui: api
        });
    }
});
