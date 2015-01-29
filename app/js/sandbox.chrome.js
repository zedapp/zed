/**
 * This module manages the Zed sandbox, the sandbox is used to run user
 * provided code, either fetched from the Zed code base itself, or fetched
 * from remote URLs.
 *
 * Sandboxed code cannot crash Zed itself, but can call some Zed-specific APIs.
 * These APIs live in the "zed/*" require.js namespace in the sandbox, and are
 * essentially proxies proxying the request to Zed itself via postMessage
 * communication. The APIs interfaces are defined in sandbox/interface/zed/*
 * and the Zed side is implemented in sandbox/impl/zed/*.
 */
/*global define, $, _ */
define(function(require, exports, module) {
    plugin.consumes = ["command"];
    plugin.provides = ["sandbox"];
    return plugin;

    function plugin(options, imports, register) {
        var command = imports.command;

        var async = require("./lib/async");
        var events = require("./lib/events");

        var id = 0; // global request counter
        var waitingForReply = {}; // global waiting for message registry

        function Sandbox() {
            this.sandboxEl = null;
            events.EventEmitter.call(this, false);
            this.execCommand = async.queueUntilEvent(this, "sandboxready", this.$execCommand.bind(this));
            this.reset();
        }

        Sandbox.prototype = new events.EventEmitter();

        Sandbox.prototype.$execCommand = function(name, spec, session) {
            var sandbox = this;
            return new Promise(function(resolve, reject) {
                if (session.$cmdInfo) {
                    spec = _.extend({}, spec, session.$cmdInfo);
                    session.$cmdInfo = null;
                }
                id++;
                waitingForReply[id] = function(err, result) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                };
                var scriptUrl = spec.scriptUrl;
                if (scriptUrl[0] === "/") {
                    scriptUrl = "configfs!" + scriptUrl;
                }
                // This data can be requested as input in commands.json
                var inputs = {};
                for (var input in (spec.inputs || {})) {
                    inputs[input] = zed.getService("sandboxes").getInputable(session, input);
                }
                sandbox.sandboxEl[0].contentWindow.postMessage({
                    url: scriptUrl,
                    data: _.extend({}, spec, {
                        path: session.filename,
                        inputs: inputs
                    }),
                    id: id
                }, '*');

            });
        };
        Sandbox.prototype.reset = function() {
            var sandbox = this;
            return new Promise(function(resolve) {
                sandbox.destroy();

                var sandboxEl = $('<webview class="sandbox" src="data:text/html,<html><body>Right click and choose Inspect Element to open error console.</body></html>">');
                sandbox.sandboxEl = sandboxEl;
                $("body").append(sandboxEl);
                var sb = sandboxEl[0];
                sandboxEl.css("left", "-1000px");
                sb.addEventListener("contentload", function() {
                    sb.executeScript({
                        code: require("text!../dep/require.js") + require("text!../dep/underscore-min.js") + require("text!./sandbox_webview.js") + require("text!../dep/json5.js") + require("text!../dep/zedb.js")
                    });
                    sandbox.emit("sandboxready");
                    resolve();
                });
                sb.addEventListener('consolemessage', function(e) {
                    console.log('[Sandbox]: ' + e.message + ' (line: ' + e.line + ')');
                });
            });
        };

        Sandbox.prototype.destroy = function() {
            if (this.sandboxEl) {
                this.sandboxEl.remove();
            }
        };

        var api = {
            Sandbox: Sandbox
        };

        /**
         * Handle a request coming from within the sandbox, and send back a response
         */
        function handleApiRequest(event) {
            var data = event.data;
            require(["./sandbox/" + data.module], function(mod) {
                if (!mod[data.call]) {
                    return event.source.postMessage({
                        replyTo: data.id,
                        err: "No such method: " + mod
                    }, "*");
                }
                var r = mod[data.call].apply(mod, data.args);
                if (!r || !r.then) {
                    console.error("Got empty result from", mod, data.call);
                }
                r.then(function(result) {
                    event.source.postMessage({
                        replyTo: data.id,
                        result: result
                    }, "*");
                }, function(err) {
                    event.source.postMessage({
                        replyTo: data.id,
                        err: err,
                    }, "*");
                });
            });
        }

        window.onmessage = function(event) {
            var data = event.data;
            var replyTo = data.replyTo;
            if (data.type === "request") {
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
        };

        window.execSandboxApi = function(api, args) {
            var parts = api.split('.');
            var mod = parts.slice(0, parts.length - 1).join('/');
            var call = parts[parts.length - 1];
            return new Promise(function(resolve, reject) {
                require(["./sandbox/" + mod], function(mod) {
                    if (!mod[call]) {
                        return reject("No such method: " + call);
                    }
                    mod[call].apply(this, args).then(resolve, reject);
                });
            });
        };

        register(null, {
            sandbox: api
        });

    }
});
