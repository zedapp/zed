/*global $, define*/
define(function(require, exports, module) {
    plugin.consumes = ["command", "handlers"];
    return plugin;

    function plugin(options, imports, register) {
        var AcePopup = require("ace/autocomplete/popup").AcePopup;
        var HashHandler = require("ace/keyboard/hash_handler").HashHandler;
        var command = imports.command;
        var runSessionHandler = imports.handlers.runSessionHandler;

        function showActions(edit, session) {
            var popup = new AcePopup(document.body || document.documentElement);
            $(popup.container).addClass("actionbox");
            var keyboardHandler = new HashHandler();
            keyboardHandler.bindKeys({
                "Up": function() {
                    go("up");
                },
                "Down": function() {
                    go("down");
                },
                "Esc": function() {
                    close();
                },
                "Return": function() {
                    runFix();
                }
            });

            //popup.setData(actions);
            popup.setData([{
                caption: "Loading..."
            }]);
            show();
            runSessionHandler(session, "action").then(function(results) {
                if (results && results.length > 0) {
                    popup.setData(results.map(handlerResultToFixResult));
                } else {
                    popup.setData([{caption: "No actions available."}]);
                    setTimeout(function() {
                        close();
                    }, 1000);
                }
            }, function(err) {
                console.error("Error running action", err);
            });

            function show() {
                var renderer = edit.renderer;
                popup.setFontSize(edit.getFontSize());
                var cursorPos = edit.getCursorPosition();

                var lineHeight = renderer.layerConfig.lineHeight;

                var pos = renderer.$cursorLayer.getPixelPosition(cursorPos, true);
                pos.left -= popup.getTextLeftOffset();

                var rect = edit.container.getBoundingClientRect();
                pos.top += rect.top - renderer.layerConfig.offset;
                pos.left += rect.left - edit.renderer.scrollLeft;
                pos.left += renderer.$gutterLayer.gutterWidth;

                popup.show(pos, lineHeight);
                popup.on("click", function(e) {
                    runFix();
                    e.stop();
                });
                init();
            }

            function runFix() {
                var action = popup.getData(popup.getRow());
                close();
                action.onSelect(edit);
            }

            function init() {
                edit.keyBinding.addKeyboardHandler(keyboardHandler);
                edit.on("changeSelection", close);
                // edit.on("blur", close);
                edit.on("mousedown", close);
                edit.on("mousewheel", close);
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

            function close() {
                $(popup.container).remove();
                edit.keyBinding.removeKeyboardHandler(keyboardHandler);
                edit.off("changeSelection", close);
                edit.off("blur", close);
                edit.off("mousedown", close);
                edit.off("mousewheel", close);
            }
        }

        /**
         * Result format:
         * {
         *    caption: "Do ABC"
         *    command: "Some:Command",
         *    info: { random data},
         *    score: number
         * }
         *
         */

        function handlerResultToFixResult(result) {
            return {
                caption: result.caption,
                meta: "action",
                onSelect: function(edit) {
                    var session = edit.getSession();
                    // SUPER ugly hack to pass in additional info to the command
                    session.$cmdInfo = result.info;
                    command.exec(result.command, edit, session);
                }
            };
        }

        command.define("Tools:Action", {
            doc: "", // I don't actually know what this does -robru
            exec: function(edit, session) {
                showActions(edit, session);
            }
        });

        register();
    }
});
