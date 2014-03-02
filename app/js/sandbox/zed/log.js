/* global define */
define(function(require, exports, module) {
    return {
        log: function(level, args, callback) {
            console[level].apply(console, ["[Sandbox]"].concat(args));
            callback();
        }
    };
});