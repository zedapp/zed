define(function(require, exports, module) {
    "use strict";

    exports.getCompletions = function(edit, session, pos, prefix, callback) {
        var mode = session.mode;
        var matches = [];
        mode.builtins.forEach(function(builtin) {
            if(builtin.indexOf(prefix) === 0) {
                matches.push({
                    name: builtin,
                    value: builtin,
                    meta: "builtin",
                    score: 99
                });
            }
        });
        callback(null, matches);
    };
});
