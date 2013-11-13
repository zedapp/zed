define(function(require, exports, module) {
    "use strict";

    var async = require("async");
    var command = require("../command");

    exports.getCompletions = function(edit, session, pos, prefix, callback) {
        var events = session.mode.events;
        var results = [];
        if(events.complete) {
            async.each(events.complete, function(cmdName, next) {
                command.exec(cmdName, edit, session, function(err, results_) {
                    if(err) {
                        console.error(err);
                        return next();
                    }
                    results = results.concat(results_);
                    next();
                });
            }, function() {
                callback(null, results);
            });
        } else {
            callback(null, []);
        }
    };
});
