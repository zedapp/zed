/* global define, _ */
define(function(require, exports, module) {
    plugin.consumes = ["session_manager"];
    return plugin;

    function plugin(options, imports, register) {
        // zed::log document is set up in `boot.js`
        var session_manager = imports.session_manager;

        // return register();

        var oldLog = console.log;
        var oldWarn = console.warn;
        var oldError = console.info;
        var oldInfo = console.info;
        var noop = function() {};
        window.console.log = log("log", oldLog);
        window.console.warn = log("warn", oldWarn);
        window.console.error = log("error", oldError);
        window.console.info = log("info", oldInfo);

        window.onerror = function(err) {
            log("exception", noop)(err.message, err.stack);
        };

        function log(level, oldFn) {
            return function() {
                oldFn.apply(console, arguments);
                var session = session_manager.specialDocs["zed::log"];
                if (!session) {
                    return;
                }
                session.insert({
                    row: session.getLength(),
                    column: 0
                }, toLogEntry(level, arguments));
            };
        }

        function toLogEntry(level, args) {
            var s = '* [' + level + ']';
            _.each(args, function(arg) {
                s += ' ';
                if (_.isString(arg)) {
                    s += arg;
                } else {
                    try {
                        s += JSON5.stringify(arg, null, 2);
                    } catch(e) {
                        s += "<<circular JSON>>";
                    }
                }
            });
            return s + "\n";
        }

        register();
    }
});
