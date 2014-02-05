define(function(require, exports, module) {
    var command = require("./command");
    var AcePopup = require("ace/autocomplete/popup").AcePopup;
    var HashHandler = require("ace/keyboard/hash_handler").HashHandler;
    var runSessionHandler = require("./handlers").runSessionHandler;
    var eventbus = require("./lib/eventbus");

    function showFixes(edit, fixes) {
        var popup = new AcePopup(document.body || document.documentElement);
        $(popup.container).addClass("fixbox");
        var keyboardHandler = new HashHandler();
        keyboardHandler.bindKeys({
            "Up": function(editor) {
                go("up");
            },
            "Down": function(editor) {
                go("down");
            },
            "Esc": function(editor) {
                close();
            },
            "Return": function(editor) {
                runFix();
            }
        });

        popup.setData(fixes);
        show();

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
            var fix = popup.getData(popup.getRow());
            close();
            fix.onSelect(edit);
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
            meta: "fix",
            onSelect: function(edit) {
                var session = edit.getSession();
                // SUPER ugly hack to pass in additional info to the command
                session.$cmdInfo = result.info;
                command.exec(result.command, edit, session);
            }
        };
    }

    command.define("Tools:Fix", {
        exec: function(edit, session) {
            runSessionHandler(session, "fix", null, function(err, results) {
                if (err) {
                    return console.error("Error running fix", err);
                }
                if (results.length > 0) {
                    showFixes(edit, results.map(handlerResultToFixResult));
                } else {
                    eventbus.emit("sessionactivityfailed", session, "No fixes available");
                }
            });

        }
    });
});