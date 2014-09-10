var inited = false;

// Editor socket
// TODO: Factor this out somehow
var timeOut = 2000;
var reconnectTimeout = null;
var pingInterval = null;
var pongTimeout = null;
var editorSocketConn;
var currentSocketOptions = {};

function init() {
    var gui = window.require("nw.gui");
    inited = true;


    function openEditor(title, url) {
        var w = gui.Window.open('editor.html?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title), {
            position: 'center',
            width: 800,
            height: 600,
            frame: false,
            toolbar: false,
            icon: "Icon.png"
        });
        return new Promise(function(resolve) {
            w.once("loaded", function() {
                w.focus();
                resolve({
                    addCloseListener: function(listener) {
                        w.on("closed", function() {
                            listener();
                        });
                    },
                    window: w.window,
                    focus: function() {
                        w.focus();
                    }
                });
            });
        });
    }


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

        var userKey = window.localStorage.zedremUserKey ? JSON.parse(window.localStorage.zedremUserKey) : null;
        if (!userKey) {
            userKey = createUUID();
            window.localStorage.zedremUserKey = JSON.stringify(userKey);
        }
        currentSocketOptions = {
            server: server,
            userKey: userKey
        };
        editorSocket(currentSocketOptions);
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
        editorSocketConn = new window.WebSocket(zedremConfig.server + '/editorsocket');
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
            // console.log("Close", e);
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

    exports.initEditorSocket = initEditorSocket;

}

exports.configZedrem = function(newServer) {
    if (!inited) {
        init();
    }
    if (currentSocketOptions.server !== newServer) {
        exports.initEditorSocket(newServer);
    }
};


process.on('uncaughtException', function(err) {
    process.stdout.write('Caught exception: ' + err);
});
