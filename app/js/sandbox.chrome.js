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

        var sandboxEl;
        var id;
        var waitingForReply;
        var inputables = {};

        var api = {
            defineInputable: function(name, fn) {
                inputables[name] = fn;
            },
            getInputable: function(session, name) {
                return inputables[name] && inputables[name](session);
            },
            /**
             * Programmatically call a sandbox command, the spec argument has the following keys:
             * - scriptUrl: the URL (http, https or relative local path) of the require.js module
             *   that implements the command
             * Any other arguments added in spec are passed along as the first argument to the
             * module which is executed as a function.
             */
            execCommand: function(name, spec, session, callback) {
                if (session.$cmdInfo) {
                    spec = _.extend(spec, session.$cmdInfo);
                    session.$cmdInfo = null;
                }
                id++;
                waitingForReply[id] = callback;
                var scriptUrl = spec.scriptUrl;
                if (scriptUrl[0] === "/") {
                    scriptUrl = "configfs!" + scriptUrl;
                }
                // This data can be requested as input in commands.json
                var inputs = {};
                for (var input in (spec.inputs || {})) {
                    inputs[input] = this.getInputable(session, input);
                }
                sandboxEl[0].contentWindow.postMessage({
                    url: scriptUrl,
                    data: _.extend({}, spec, {
                        path: session.filename,
                        inputs: inputs
                    }),
                    id: id
                }, '*');
            }
        };

        /**
         * If we would like to reset our sandbox (e.d. to reload code), we can
         * simply delete and readd the iframe.
         */
        function resetSandbox(callback) {
            if (sandboxEl) {
                // sandboxEl[0].clearData({}, {cache: true}, function() {
                // });
                sandboxEl.remove();
            }
            $("body").append('<webview id="sandbox" partition="persist:sandbox" src="data:text/html,<html><body>Right click and choose Inspect Element to open error console.</body></html>">');
            sandboxEl = $("#sandbox");
            var sandbox = sandboxEl[0];
            sandbox.addEventListener('permissionrequest', function(e) {
                console.log("Got permission request", e);
            });
            sandboxEl.css("left", "-1000px");
            sandbox.addEventListener("contentload", function() {
                sandbox.executeScript({
                    code: require("text!../dep/require.js") + require("text!../dep/underscore-min.js") + require("text!./sandbox_webview.js") + require("text!../dep/json5.js") + require("text!../dep/zedb.js")
                });
                _.isFunction(callback) && callback();
            });
            sandbox.addEventListener('consolemessage', function(e) {
                console.log('[Sandbox]: ' + e.message + ' (line: ' + e.line + ')');
            });
            waitingForReply = {};
            id = 0;
        }

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
                mod[data.call].apply(mod, data.args.concat([function(err, result) {
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
        });


        window.execSandboxApi = function(api, args, callback) {
            var parts = api.split('.');
            var mod = parts.slice(0, parts.length - 1).join('/');
            var call = parts[parts.length - 1];
            require(["./sandbox/" + mod], function(mod) {
                if (!mod[call]) {
                    return callback("No such method: " + call);
                }
                mod[call].apply(this, args.concat([callback]));
            });
        };

        command.define("Sandbox:Reset", {
            doc: "Reload all sandbox code. If you've made changes to a Zed " + "extension in your sandbox, you must run this for those changes " + "to take effect.",
            exec: resetSandbox,
            readOnly: true
        });

        command.define("Sandbox:Show", {
            doc: "Inspect your sandbox contents.",
            exec: function() {
                sandboxEl.css("left", "50px");
                setTimeout(function() {
                    sandboxEl.css("left", "-1000px");
                }, 5000);
            }
        });

        resetSandbox(function() {
            register(null, {
                sandbox: api
            });
        });

    }
});
