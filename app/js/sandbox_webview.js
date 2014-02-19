/*global define, sandboxRequest*/
var debug = false;

define("configfs", [], {
    load: function(name, req, onload, config) {
        sandboxRequest("zed/configfs", "readFile", [name], function(err, text) {
            if (err) {
                return console.error("Error while loading file", err);
            }
            text = text.replace(/require\s*\((["'])zed\/(.+)["']\)/g, function(all, q, mod) {
                return "require(" + q + "configfs!/api/zed/" + mod + (/\.js$/.exec(mod) ? "" : ".js") + q + ")";
            })
            //                       .replace(/require\s*\((["'])\.\/(.+)["']\)/g, function(all, q, mod) { return "require(" + q + "configfs!./" + mod + (/\.js$/.exec(mod) ? "" : ".js") + q + ")"; })
            onload.fromText(text);
        });
    }
});

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