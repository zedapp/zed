define(function(require, exports, module) {
    "use strict";

    var oop = require("ace/lib/oop");
    var MarkdownHighlightRules = require("ace/mode/markdown_highlight_rules").MarkdownHighlightRules;

    var CommitHighlightRules = function() {
        MarkdownHighlightRules.call(this);

        this.$rules.start.unshift({
            token: "comment",
            regex: /#/,
            next: "line_comment"
        });
        this.$rules.line_comment = [{
            token: "comment",
            regex: "$|^",
            next: "start"
        }, {
            defaultToken: "comment"
        }];
    };
    oop.inherits(CommitHighlightRules, MarkdownHighlightRules);

    exports.CommitHighlightRules = CommitHighlightRules;
});
