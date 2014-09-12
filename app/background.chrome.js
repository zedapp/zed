/*global chrome*/

var isLinux = !! /linux/i.exec(navigator.platform);
// var isLinux = false;

function openEditor(title, url, urlPostfix) {
    urlPostfix = urlPostfix || "";
    return new Promise(function(resolve, reject) {
        chrome.app.window.create('editor.html?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title) + urlPostfix, {
            frame: isLinux ? 'chrome' : 'none',
            width: 800,
            height: 600
        }, function(win) {
            win.focus();
            resolve(win);
        });
    });
}

function showWindow() {
    openEditor("Zed", "");
}

chrome.app.runtime.onLaunched.addListener(showWindow);

var ongoingTextAreaEdits = {};

chrome.runtime.onConnectExternal.addListener(function(port) {
    var id = "" + Date.now();
    ongoingTextAreaEdits[id] = port;
    port.onMessage.addListener(function(req) {
        if (req.text !== undefined) {
            openEditor("Edit Text Area", "textarea:" + req.text, "&id=" + id).then(function(win) {
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


// Editor socket
// TODO: Factor this out somehow
var timeOut = 2000;
var reconnectTimeout = null;
var pingInterval = null;
var pongTimeout = null;
var editorSocketConn;
var currentSocketOptions = {};

function initEditorSocket(server) {
    function createUUID() {
        var s = [];
        var hexDigits = "0123456789ABCDEF";
        for (var i = 0; i < 32; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        s[12] = "4";
        s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1);

        var uuid = s.join("");
        return uuid;
    }

    chrome.storage.sync.get("zedremUserKey", function(results) {
        var userKey = results.zedremUserKey;
        if (!userKey) {
            userKey = createUUID();
            chrome.storage.sync.set({
                zedremUserKey: userKey
            });
        }
        currentSocketOptions = {
            server: server,
            userKey: userKey
        };
        editorSocket(currentSocketOptions);
    });
}


function closeSocket() {
    if (editorSocketConn) {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
        }
        if (pingInterval) {
            clearInterval(pingInterval);
        }
        if (pongTimeout) {
            clearTimeout(pongTimeout);
        }
        editorSocketConn.onclose = function() {};
        editorSocketConn.close();
    }
}

function editorSocket(zedremConfig) {
    if (!zedremConfig.server) {
        // You can disable connecting to zedrem by setting server to null or false
        return;
    }
    console.log("Attempting to connect to", zedremConfig.server + "/editorsocket");
    editorSocketConn = new WebSocket(zedremConfig.server + '/editorsocket');
    editorSocketConn.onopen = function() {
        console.log("Connected to zedrem server!");
        editorSocketConn.send(JSON.stringify({
            version: "1",
            UUID: zedremConfig.userKey
        }));
        timeOut = 2000;
        pingInterval = setInterval(function() {
            console.log("Ping");
            editorSocketConn.send(JSON.stringify({
                type: "ping"
            }));
            pongTimeout = setTimeout(function() {
                console.log("Ping timed out, reconnecting...");
                closeSocket();
                initEditorSocket(zedremConfig.server);
            }, 3000);
        }, 5000);
    };
    editorSocketConn.onerror = function(err) {
        console.error("Socket error", err);
    };
    editorSocketConn.onmessage = function(e) {
        var message = e.data;
        try {
            message = JSON.parse(message);
            switch (message.type) {
                case 'pong':
                    clearTimeout(pongTimeout);
                    pongTimeout = null;
                    console.log("Got pong");
                    break;
                case 'open':
                    var url = zedremConfig.server.replace("ws://", "http://").replace("wss://", "https://") + "/fs/" + message.url;
                    console.log("Now have ot open URL:", url);
                    openEditor("Remote", url);
                    break;
            }
        } catch (e) {
            console.error("Couldn't deserialize:", message, e);
        }
    };
    editorSocketConn.onclose = function(e) {
        console.log("Close", e);
        if (timeOut < 5 * 60 * 1000) { // 5 minutes max
            timeOut *= 2;
        }
        closeSocket();
        console.log("Socket closed, retrying in", timeOut / 1000, "seconds");
        reconnectTimeout = setTimeout(function() {
            editorSocket(zedremConfig);
        }, timeOut);
    };
}

window.configZedrem = function(zedremConfig) {
    if (JSON.stringify(currentSocketOptions) !== JSON.stringify(zedremConfig)) {
        initEditorSocket(zedremConfig.server);
    }
};

var openProjects = {};

window.openProject = function(title, url) {
    console.log("Going to open", title, url);
    if (openProjects[url]) {
        var win = openProjects[url].win;
        win.focus();
        win.contentWindow.zed.services.editor.getActiveEditor().focus();
    } else {
        openEditor(title, url);
    }
};

window.registerWindow = function(title, url, win) {
    if(!url) {
        return;
    }
    openProjects[url] = {
        win: win,
        title: title
    };
    win.onClosed.addListener(function() {
        console.log("Closed a window!", url);
        delete openProjects[url];
    });
};

window.getOpenWindows = function() {
    var wins = [];
    Object.keys(openProjects).forEach(function(url) {
        wins.push({title: openProjects[url].title, url: url});
    });
    return wins;
};
