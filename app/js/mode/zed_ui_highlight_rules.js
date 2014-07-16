define(function(require, exports, module) {
    "use strict";

    var oop = require("ace/lib/oop");
    var lang = require("ace/lib/lang");
    var MarkdownHighlightRules = require("ace/mode/markdown_highlight_rules").MarkdownHighlightRules;

    var ZedUiHighlightRules = function() {
        MarkdownHighlightRules.call(this);

        this.$rules.start.unshift({
            token: "ui_button",
            regex: /\[[^\]]+\]/
        });
        this.$rules.listblock.unshift({
            token: "ui_button",
            regex: /\[[^\]]+\]/
        });

    };
    oop.inherits(ZedUiHighlightRules, MarkdownHighlightRules);

    exports.ZedUiHighlightRules = ZedUiHighlightRules;
});
