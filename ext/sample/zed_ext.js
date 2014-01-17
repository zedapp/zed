/* global chrome */
var zed = window.zed = {
    zedAppId: "pfmjnmeipppmcebplngmhfkleiinphhp",
    conn: null,
    reqId: 0,
    waitingForResponse: {},
    /**
     * Implements basic RPC
     */
    sendRequest: function(req, callback) {
        req.reqId = zed.reqId++;
        zed.waitingForResponse[req.reqId] = callback || function() {};
        zed.conn.postMessage(req);
    },
    register: function(config) {
        zed.conn = chrome.runtime.connect(zed.zedAppId);
        var manifest = chrome.runtime.getManifest();
        
        zed.sendRequest({
            type: "register",
            name: manifest.name,
            version: manifest.version,
            config: config
        }, function(err) {
            if (err) {
                console.error("Zed probably not started yet, will try again later");

            } else {
                console.log("Connected.");
            }
        });

        zed.conn.onMessage.addListener(function(req) {
            if (req.replyTo !== undefined) {
                zed.waitingForResponse[req.replyTo](req.err, req.result);
                delete zed.waitingForResponse[req.replyTo];
            } else {
                switch (req.type) {
                    case 'command':
                        zed.oncommand(req.project, req.name, req.spec, req.info, function(err, result) {
                            zed.conn.postMessage({
                                replyTo: req.reqId,
                                err: err,
                                result: result
                            });
                        });
                        break;
                    default:
                        console.error("Don't understand", req);
                }
            }
        });

        zed.conn.onDisconnect.addListener(function() {
            console.log("Got disconnected, will connect again in 10s");
            setTimeout(function() {
                zed.register(config);
            }, 10000);
        });
    },
    /**
     * api: zed.session.goto (= zed/session goto)
     */
    exec: function(project, api, args, callback) {
        zed.sendRequest({
            type: 'api',
            project: project,
            api: api,
            args: args
        }, callback);
    },
    oncommand: function(project, name, spec, info, callback) {
        console.error("Override zed.oncommand with your own handler");
    }
};