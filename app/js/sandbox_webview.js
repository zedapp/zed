/*global define, sandboxRequest, _*/
var debug = false;

require.config({
    waitSeconds: 30
});

define("configfs", [], {
    load: function(name, req, onload, config) {
        // console.log("Request for configfs file", name);
        sandboxRequest("zed/configfs", "readFile", [name]).then(function(text) {
            // console.log("Sending", name);
            onload.fromText(amdTransformer(name, text));
        }, function(err) {
            return console.error("Error while loading file", name, err);
        });
    }
});

function absPath(abs, rel) {
    var absParts = abs.split('/');
    var relParts = rel.split('/');
    absParts.pop(); // dir
    for(var i = 0; i < relParts.length; i++) {
        if(relParts[i] === '.') {
            continue;
        }
        if(relParts[i] === '..') {
            absParts.pop();
            continue;
        }
        absParts = absParts.concat(relParts.slice(i));
        break;
    }
    return absParts.join('/');
}

/**
 * This rewrites extension code in two minor ways:
 * - requires are rewritten to all point to configfs!
 * - AMD wrappers are added if they're not already there'
 */
function amdTransformer(moduleAbsPath, source) {
    // If this source file is not doing funky stuff like overriding require
    if (!/require\s*=/.exec(source)) {
        source = source.replace(/require\s*\((["'])(.+)["']\)/g, function(all, q, mod) {
            var newMod = mod;
            if (mod.indexOf("zed/") === 0) {
                newMod = "configfs!/api/" + mod;
            } else if (mod.indexOf(".") === 0) {
                newMod = "configfs!" + absPath(moduleAbsPath, mod);
            } else {
                return all;
            }
            return "require(" + q + newMod + (/\.js$/.exec(newMod) ? "" : ".js") + q + ")";
        });
    }
    // If no AMD wrapper is there yet, add it
    if (source.indexOf("define(function(") === -1) {
        source = "define(function(require, exports, module) {" + source + "\n});";
    }
    return source;
}

var source;
var origin;
var id = 0;
var waitingForReply = {};

window.sandboxRequest = function(module, call, args) {
    return new Promise(function(resolve, reject) {
        id++;
        waitingForReply[id] = {
            resolve: resolve,
            reject: reject
        };
        source.postMessage({
            type: "request",
            id: id,
            module: module,
            call: call,
            args: args
        }, origin);
    });
};

function handleApiResponse(event) {
    var data = event.data;
    var p = waitingForReply[data.replyTo];

    if (undefined !== data.err && null !== data.err) {
        p.reject(data.err);
    } else {
        p.resolve(data.result);
    }
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
        Promise.resolve(data.data).then(fn).then(function(result) {
            var message = {
                replyTo: id,
                result: result
            };
            if (debug) {
                console.log(message);
            }
            event.source.postMessage(message, origin);
        }, function(err) {
            var message = {
                replyTo: id,
                err: typeof err === "string" ? err : err.message
            };
            event.source.postMessage(message, origin);
        });
    });
});

// Override console.log etc
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
    function toLogEntry(args) {
        var s = '';
        _.each(args, function(arg) {
            if (_.isString(arg)) {
                s += arg;
            } else {
                s += JSON5.stringify(arg, null, 2);
            }
            s += ' ';
        });
        return s;
    }
    return function() {
        oldFn.call(console, toLogEntry(arguments));
        // sandboxRequest("zed/log", "log", [level, Array.prototype.slice.call(arguments, 0)], function() {});
    };
}
