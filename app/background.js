/*global chrome*/

function showProjects() {
    chrome.app.window.create('open.html', {
        frame: 'chrome',
        width: 400,
        height: 180
    }, function(win) {
        win.focus();
    });
}

chrome.app.runtime.onLaunched.addListener(showProjects);

// Extension handling
var extensions = {};
var projects = {};
var reqId = 0;
var waitingForResponse = {};

chrome.runtime.onConnectExternal.addListener(function(port) {
    var extId = port.sender.id;
    // projects[extId] = port;
    console.log("Extension", extId, "connected");
    port.onMessage.addListener(function(req) {
        if (req.replyTo !== undefined) {
            waitingForResponse[req.replyTo](req.err, req.result);
            delete waitingForResponse[req.replyTo];
        } else {
            switch (req.type) {
                case 'register':
                    extensions[extId] = {
                        name: req.name,
                        version: req.version,
                        config: req.config,
                        port: port
                    };
                    port.postMessage({
                        replyTo: req.reqId,
                        err: null,
                        result: "Registered"
                    });
                    triggerConfigReloads();
                    break;
                case 'api':
                    var project = projects[req.project];
                    if(!project) {
                        return console.error("No such project:", req.project);
                    }
                    project.contentWindow.execSandboxApi(req.api, req.args, function(err, result) {
                        port.postMessage({
                            replyTo: req.reqId,
                            err: err,
                            result: result
                        });
                    });
                    break;
                default:
                    port.postMessage({
                        replyTo: req.reqId,
                        err: "Don't understand: " + req.type
                    });
            }
        }
    });
    port.onDisconnect.addListener(function() {
        delete extensions[extId];
        console.log("Extension", extId, "unregistered");
        triggerConfigReloads();
    });
});

function triggerConfigReloads() {
    console.log("Going to trigger reloads");
    for (var p in projects) {
        var projectWin = projects[p];
        console.log("Reloading config for:", p);
        projectWin.contentWindow.eventbus.emit("configneedsreloading");
    }
}

function sendExtensionRequest(extId, req, callback) {
    reqId++;
    waitingForResponse[reqId] = callback;
    req.reqId = reqId;
    extensions[extId].port.postMessage(req);
}

window.execExtensionCommand = function(project, name, spec, info, callback) {
    sendExtensionRequest(spec.extId, {
        type: 'command',
        project: project,
        name: name,
        spec: spec,
        info: info
    }, callback);
};

window.getAllConfigs = function() {
    return Object.keys(extensions).map(function(extId) {
        return extensions[extId].config;
    });
};