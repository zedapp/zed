define(function(require, exports, module) {
    module.exports = {
        htmlEscape: function(s) {
            return s.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        }
    };
});
