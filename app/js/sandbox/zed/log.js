/* global define */
define(function(require, exports, module) {
    return {
        log: function(level, args) {
            console[level].apply(console, ["[Sandbox]"].concat(args));
            return Promise.resolve();
        }
    };
});
