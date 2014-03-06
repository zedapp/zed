/*global define, sandboxRequest*/
var debug = false;

define("configfs", [], {
    load: function(name, req, onload, config) {
        sandboxRequest("zed/configfs", "readFile", [name], function(err, text) {
            if (err) {
                return console.error("Error while loading file", err);
            }
            onload.fromText(amdTransformer(text));
        });
    }
});

/**
 * This rewrites extension code in two minor ways:
 * - requires are rewritten to all point to configfs!
 * - AMD wrappers are added if they're not already there'
 */
function amdTransformer(source) {
    // If this source file is not doing funky stuff like overriding require
    if (!/require\s*=/.exec(source)) {
        source = source.replace(/require\s*\((["'])(.+)["']\)/g, function(all, q, mod) {
            var newMod = mod;
            if (mod.indexOf("zed/") === 0) {
                newMod = "configfs!/api/" + mod;
            } else if (mod.indexOf("./") === 0) {
                newMod = "configfs!" + mod;
            } else {
                return all;
            }
            return "require(" + q + newMod + (/\.js$/.exec(newMod) ? "" : ".js") + q + ")";
        });
    }
    // If no AMD wrapper is there yet, add it
    if (source.indexOf("define(function(") === -1) {
        source = "define(function(require, exports, module) {" + source + "\n});"
    }
    return source;
}

var source;
var origin;
var id = 0;
var waitingForReply = {};

window.sandboxRequest = function(module, call, args, callback) {
    id++;
    waitingForReply[id] = callback;
    source.postMessage({
        type: "request",
        id: id,
        module: module,
        call: call,
        args: args
    }, origin);
}

function handleApiResponse(event) {
    var data = event.data;
    waitingForReply[data.replyTo](data.err, data.result);
    delete waitingForReply[data.replyTo];
}

window.addEventListener('message', function(event) {
    var data = event.data;
    var id = data.id;
    var url = data.url;

    source = event.source;
    origin = event.origin;
    if (data.replyTo) {
        return handleApiResponse(event);
    }
    if (!url) {
        return;
    }

    require([url], function(fn) {
        fn(data.data, function(err, result) {
            var message = {
                replyTo: id,
                err: err,
                result: result
            };
            if (debug) {
                console.log(message);
            }
            event.source.postMessage(message, origin);
        });
    });
});

// Override console.log etc
/*
var oldLog = console.log;
var oldWarn = console.warn;
var oldError = console.info;
var oldInfo = console.info;
var noop = function() {};
window.console.log = log("log", oldLog);
window.console.warn = log("warn", oldWarn);
window.console.error = log("error", oldError);
window.console.info = log("info", oldInfo);

window.addEventListener("error", function(err) {
    log("error", noop)(err.message, err.filename, err.lineno, err.stack);
});

function log(level, oldFn) {
    return function() {
        oldFn.apply(console, arguments);
        sandboxRequest("zed/log", "log", [level, Array.prototype.slice.call(arguments, 0)], function() {});
    };
}
*/