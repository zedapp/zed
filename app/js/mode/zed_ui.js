define(function(require, exports, module) {
    "use strict";

    var oop = require("ace/lib/oop");
    var TextMode = require("ace/mode/text").Mode;
    var ZedUiHighlightRules = require("./zed_ui_highlight_rules").ZedUiHighlightRules;

    console.log("YOYUOYO");

    var Mode = function() {
        this.HighlightRules = ZedUiHighlightRules;
        console.log("YEAHzzzzz")
    };
    oop.inherits(Mode, TextMode);

    (function() {
        this.type = "text";

        this.getNextLineIndent = function(state, line, tab) {
            return this.$getIndent(line);
        };
        this.$id = "mode/zed_ui";
    }).call(Mode.prototype);

    exports.Mode = Mode;
});
