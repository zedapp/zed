/* global ace, define*/
define(function(require, exports, module) {
    var Anchor = require("ace/anchor").Anchor;
    var Range = require("ace/range").Range;

    function InlineAnnotation(session, info) {
        this.session = session;
        this.info = info;
        this.startAnchor = new Anchor(session.getDocument(), info.row, info.column);
        this.endAnchor = new Anchor(session.getDocument(), info.row, info.endColumn - 1);
        this.startAnchor.on("change", this.update.bind(this));
        this.endAnchor.on("change", this.update.bind(this));
        this.marker = null;
        this.update();
    }

    InlineAnnotation.prototype = {
        update: function() {
            var endPos = this.endAnchor.getPosition();
            var range = Range.fromPoints(this.startAnchor.getPosition(), {
                row: endPos.row,
                column: endPos.column + 1
            });
            if (this.marker) {
                this.session.removeMarker(this.marker);
            }
            this.marker = this.session.addMarker(range, "marker-highlight-" + this.info.type);
        },
        remove: function() {
            this.startAnchor.detach();
            this.endAnchor.detach();
            if (this.marker) {
                this.session.removeMarker(this.marker);
            }
        }
    };

    return InlineAnnotation;
});