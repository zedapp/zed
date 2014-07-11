define(function(require, exports, module) {
    "use strict";

    var oop = require("ace/lib/oop");
    var lang = require("ace/lib/lang");
    var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;

    var ZedUiHighlightRules = function() {
        // regexp must not have capturing parentheses
        // regexps are ordered -> the first match is used

        this.$rules = {
            "start": [{ // button
                token: "ui_button",
                regex: /\[[^\]]+\]/
            }, {
                defaultToken: "text"
            }]
        };

        // this.normalizeRules();
    };
    oop.inherits(ZedUiHighlightRules, TextHighlightRules);

    exports.ZedUiHighlightRules = ZedUiHighlightRules;
});
