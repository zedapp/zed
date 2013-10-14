/*global define, $*/
define(function(require, exports, module) {
    var command = require("./command");
    var custom_command = require("./lib/custom_command");

    var sandboxEl;
    var id;
    var waitingForReply;

    function resetSandbox() {
        if (sandboxEl) {
            sandboxEl.remove();
        }
        $("body").append('<iframe src="sandbox.html" id="sandbox" style="display: none;">');
        sandboxEl = $("#sandbox");
        waitingForReply = {};
        id = 0;
    }

    exports.hook = function() {
        resetSandbox();
    };

    function handleApiRequest(event) {
        var data = event.data;
        require(["./sandbox/impl/" + data.module], function(mod) {
            if(!mod[data.call]) {
                return event.source.postMessage({
                    replyTo: data.id,
                    err: "No such method: " + mod
                }, "*");
            }
            mod[data.call].apply(this, data.args.concat([function(err, result) {
                event.source.postMessage({
                    replyTo: data.id,
                    err: err,
                    result: result
                }, "*");
            }]));
        });
    }

    window.addEventListener('message', function(event) {
        var data = event.data;
        var replyTo = data.replyTo;
        if(data.type === "request") {
            return handleApiRequest(event);
        }
        if (!replyTo) {
            return;
        }
        var err = data.err;
        var result = data.result;

        if (waitingForReply[replyTo]) {
            waitingForReply[replyTo](err, result);
            delete waitingForReply[replyTo];
        } else {
            console.error("Got response to unknown message id:", replyTo);
        }
    });


    exports.exec = function(url, options, content, callback) {
        id++;
        waitingForReply[id] = callback;
        sandboxEl[0].contentWindow.postMessage({
            url: url,
            options: options,
            content: content,
            id: id
        }, '*');
    };

    exports.execCommand = function(spec, session, callback) {
        id++;
        waitingForReply[id] = callback;
        sandboxEl[0].contentWindow.postMessage({
            url: spec.scriptUrl,
            data: {path: session.filename},
            id: id
        }, '*');
    };

    command.define("Sandbox:Reset", {
        exec: resetSandbox,
        readOnly: true
    });
});