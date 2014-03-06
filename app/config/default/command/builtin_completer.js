/* global _ */
var session = require("zed/session");

module.exports = function(info, callback) {
    var path = info.path;
    var builtins = info.builtins;
    session.getPreceedingIdentifier(path, function(err, prefix) {
        var matches = [];
        _.each(builtins, function(builtin) {
            if (builtin.indexOf(prefix) === 0) {
                matches.push({
                    name: builtin,
                    value: builtin,
                    meta: "builtin",
                    score: 99
                });
            }
        });
        callback(null, matches);
    });
};