define(function(require, exports, module) {
    exports.indexToLine = function(text, index) {
        var s = text.substring(0, index);
        return s.split("\n").length;
    };
});