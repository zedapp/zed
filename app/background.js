/*global chrome*/

var projectsWin;

function showProjects() {
    chrome.app.window.create('open.chrome.html', {
        width: 400,
        height: 180
    }, function(win) {
        projectsWin = win;
        win.focus();
    });
}

chrome.app.runtime.onLaunched.addListener(showProjects);

var ongoingTextAreaEdits = {};

chrome.runtime.onConnectExternal.addListener(function(port) {
    var id = "" + Date.now();
    ongoingTextAreaEdits[id] = port;
    port.onMessage.addListener(function(req) {
        if (req.text !== undefined) {
            chrome.app.window.create('editor.html?id=' + id + '&title=Edit%20Text%20Area&url=textarea:' + encodeURIComponent(req.text), {
                frame: 'none',
                width: 720,
                height: 400
            }, function(win) {
                win.focus();
                win.onClosed.addListener(function() {
                    port.disconnect();
                    delete ongoingTextAreaEdits[id];
                });
            });
        }
    });
    port.onDisconnect.addListener(function() {
        delete ongoingTextAreaEdits[id];
    });
});

window.setTextAreaText = function(id, text) {
    ongoingTextAreaEdits[id].postMessage({
        text: text
    });
};

chrome.runtime.onConnectExternal.addListener(function(port) {
    var id = "" + Date.now();
    ongoingTextAreaEdits[id] = port;
    port.onMessage.addListener(function(req) {
        if (req.text !== undefined) {
            chrome.app.window.create('editor.html?id=' + id + '&title=Edit%20Text%20Area&url=textarea:' + encodeURIComponent(req.text), {
                frame: 'none',
                width: 720,
                height: 400
            }, function(win) {
                win.focus();
                win.onClosed.addListener(function() {
                    port.disconnect();
                    delete ongoingTextAreaEdits[id];
                });
            });
        } else if(req.url !== undefined) {
            projectsWin.contentWindow.openGithubUrl(req.url);
        }
    });
    port.onDisconnect.addListener(function() {
        delete ongoingTextAreaEdits[id];
    });
});
