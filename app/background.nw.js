var inited = false;

// Editor socket
// TODO: Factor this out somehow
var timeOut = 2000;
var reconnectTimeout = null;
var pingInterval = null;
var pongTimeout = null;
var editorSocketConn;
var currentSocketOptions = {};
var openProjects = {}, ignoreClose = false;

function log() {
    for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];
        if (typeof arg === "string") {
            process.stdout.write(arg);
        } else {
            process.stdout.write(JSON.stringify(arg));
        }
        process.stdout.write(' ');
    }
    process.stdout.write("\n");
}

function init() {
    if (inited) {
        return;
    }
    var require = window.require;
    var nodeRequire = window.nodeRequire;
    var gui = require("nw.gui");
    var Promise = window.Promise;
    var WebSocket = nodeRequire("ws");
    inited = true;

    if (gui.App.argv.length === 0) {
        restoreOpenWindows();
    }

    function openEditor(title, url) {
        var w = gui.Window.open('editor.html?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title), {
            position: 'center',
            width: 1024,
            height: 768,
            frame: true,
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
            currentSocketOptions.status = 'disconnected';
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
        log("Attempting to connect to", zedremConfig.server + "/editorsocket");
        editorSocketConn = new WebSocket(zedremConfig.server + '/editorsocket', {
            origin: zedremConfig.server,
            rejectUnauthorized: false
        });
        editorSocketConn.on("open", function() {
            log("Connected to zedrem server!");
            currentSocketOptions.status = 'connected';
            editorSocketConn.send(JSON.stringify({
                version: "1",
                UUID: zedremConfig.userKey
            }));
            timeOut = 2000;
            pingInterval = setInterval(function() {
                log("Ping");
                editorSocketConn.send(JSON.stringify({
                    type: "ping"
                }));
                pongTimeout = setTimeout(function() {
                    log("Ping timed out, reconnecting...");
                    closeSocket();
                    initEditorSocket(zedremConfig.server);
                }, 3000);
            }, 5000);
        });
        editorSocketConn.on("error", function(err) {
            log("Socket error", err.message);
            close(err);
        });
        editorSocketConn.on("message", function(message) {
            try {
                message = JSON.parse(message);
                switch (message.type) {
                    case 'pong':
                        clearTimeout(pongTimeout);
                        pongTimeout = null;
                        log("Got pong");
                        break;
                    case 'open':
                        var url = zedremConfig.server.replace("ws://", "http://").replace("wss://", "https://") + "/fs/" + message.url;
                        log("Now have ot open URL:", url);
                        openEditor("Remote", url);
                        break;
                }
            } catch (e) {
                log("Couldn't deserialize:", message, e);
            }
        });
        editorSocketConn.on("close", close);

        function close(e) {
            log("Close", e);
            if (timeOut < 5 * 60 * 1000) { // 5 minutes max
                timeOut *= 2;
            }
            closeSocket();
            log("Socket closed, retrying in", timeOut / 1000, "seconds");
            reconnectTimeout = setTimeout(function() {
                editorSocket(zedremConfig);
            }, timeOut);
        }
    }

    exports.initEditorSocket = initEditorSocket;

    // OPEN PROJECTS
    // Returns true if an editor needs to be opened, returns false is not (and focus has been handled already)
    exports.openProject = function(title, url) {
        log("Going to open", title, url);
        if (openProjects[url]) {
            var win = openProjects[url].win;
            win.focus();
            win.window.zed.services.editor.getActiveEditor().focus();
            return false;
        } else {
            // openEditor(title, url);
            return true;
        }
    };

    exports.registerWindow = function(title, url, win) {
        if (!url) {
            return;
        }
        openProjects[url] = {
            win: win,
            title: title
        };
        win.on("close", function() {
            process.stdout.write("Closed a window: " + url);
            delete openProjects[url];
            saveOpenWindows();
        });
        saveOpenWindows();
    };

    exports.getOpenWindows = function() {
        var wins = [];
        Object.keys(openProjects).forEach(function(url) {
            wins.push({
                title: openProjects[url].title,
                url: url
            });
        });
        return wins;
    };

    exports.closeAllWindows = function() {
        ignoreClose = true;
        for (var url in openProjects) {
            openProjects[url].win.close();
        }
    };

    function saveOpenWindows() {
        if (!ignoreClose) {
            try {
                window.localStorage.openWindows = JSON.stringify(exports.getOpenWindows());
            } catch (e) {
                log("Could save open windows");
            }
        }
    }

    function restoreOpenWindows() {
        ignoreClose = false;
        var openWindows = window.localStorage.openWindows;
        if (openWindows) {
            openWindows = JSON.parse(openWindows);
        } else {
            openWindows = [];
        }
        var first = true;
        openWindows.forEach(function(win) {
            if (first) {
                window.location = "editor.html?title=" + encodeURIComponent(win.title) + "&url=" + encodeURIComponent(win.url);
                first = false;
                return;
            }
            openEditor(win.title, win.url);
        });
    }

    // SELF UPDATE

    try {
        update();
    } catch (e) {
        log("Error", e.message);
    }

    function update() {
        var downloadUrl = "http://download.zedapp.org/";
        var $ = window.$;

        var path = nodeRequire("path");
        var http = nodeRequire("http");
        var fs = nodeRequire("fs");
        var zlib = nodeRequire('zlib');
        var tar = nodeRequire('tar');
        var os = nodeRequire('os');
        var gui = nodeRequire("nw.gui");
        var exec = nodeRequire("child_process").exec;

        // gui.Window.get().showDevTools();

        var applicationPath;
        var updated = false;

        if (process.platform === "darwin") {
            // Get to the path to the .app directory
            applicationPath = path.dirname(path.dirname(path.dirname(path.dirname(path.dirname(path.dirname(process.execPath))))));
        } else {
            applicationPath = path.dirname(process.execPath);
        }

        checkForUpdate();

        // Check very 3h
        setInterval(checkForUpdate, 1000 * 60 * 60 * 3);

        function checkForUpdate() {
            if (updated) {
                // Already updated, no need to check again
                return;
            }
            var currentVersion;
            log("Checking for update");
            getCurrentVersion().then(function(currentVersion_) {
                currentVersion = currentVersion_;
                return getNewVersion();
            }).then(function(newVersion) {
                log("Current version", currentVersion, "new version", newVersion);
                // currentVersion = "0.0"; // Force upgrade
                if (versionCompare(newVersion, currentVersion) > 0) {
                    return upgrade(newVersion).then(function() {
                        updated = true;
                        $("#update-available").fadeIn();
                    }, function(err) {
                        return showUpdateError(typeof err === "string" ? err : err.message);
                    });
                } else {
                    log("No upgrade required");
                }
            }).
            catch (function(err) {
                return showUpdateError("Couldn't check for updated version. No internet connection?");
            });
        }

        function showUpdateError(message) {
            log("Update error", message);
        }

        function getCurrentVersion() {
            return new Promise(function(resolve, reject) {
                $.get("app://./manifest.json", function(text) {
                    var json = JSON.parse(text);
                    resolve(json.version);
                }).error(function(err) {
                    reject(err);
                });
            });
        }

        function getNewVersion() {
            return new Promise(function(resolve, reject) {
                $.get(downloadUrl + "current-version.txt", function(text) {
                    resolve(text.trim());
                }).error(function(err) {
                    reject(err);
                });
            });
        }

        function downloadVersion(version) {
            var downloadFilename = "zed-";
            switch (process.platform) {
                case "darwin":
                    downloadFilename += "mac";
                    break;
                case "linux":
                    if (process.arch === "ia32") {
                        downloadFilename += "linux32";
                    } else {
                        downloadFilename += "linux64";
                    }
                    break;
                case "win32":
                    downloadFilename += "win";
                    break;
                default:
                    return Promise.reject("Platform not supported for auto updates");
            }
            downloadFilename += "-v" + version + ".tar.gz";
            var newAppDir = path.normalize(applicationPath + "/../zed.update");
            try {
                fs.mkdirSync(newAppDir);
            } catch (e) {
                if (e.errno === -17) {
                    log("Directory already exists, that's ok.");
                } else {
                    return Promise.reject(e);
                }
            }
            return new Promise(function(resolve, reject) {
                http.get(downloadUrl + downloadFilename, function(res) {
                    res.pipe(zlib.createGunzip()).pipe(tar.Extract({
                        path: newAppDir
                    })).on("error", function(err) {
                        reject(err);
                    });
                    res.on("end", function() {
                        resolve(newAppDir);
                    });
                    res.on("error", function(e) {
                        reject(e);
                    });
                }).on('error', function(e) {
                    reject(e);
                });
            });
        }

        function upgrade(version) {
            log("Upgrading...");
            return downloadVersion(version).then(function(outDir) {
                var win = gui.Window.get();
                var dirName = outDir + "/zed";
                if (process.platform === "darwin") {
                    dirName = outDir + "/Zed.app";
                }
                // Attaching to close handler, when the project picker is
                // closed, the upgrade will take place
                win.on("close", function() {
                    // For windows we generate a batch file that is launched
                    // asynchronously, and does the switcharoo while Zed is not
                    // running to avoid locking errors.
                    if (process.platform === "win32") {
                        var batchScriptPath = os.tmpdir() + "zed-update.bat";
                        fs.writeFileSync(batchScriptPath,
                            "echo Will update Zed in 5 seconds...\n\
                                    timeout /t 5 /nobreak\n\
                                    move \"" + applicationPath + "\" \"" + applicationPath + ".prev\"\n\
                                    move \"" + dirName + "\" \"" + applicationPath + "\"\n\
                                    rmdir /S /Q \"" + outDir + "\"\n\
                                    rmdir /S /Q \"" + applicationPath + ".prev\"\n\
                                    exit");
                        exec("start " + batchScriptPath);
                        setTimeout(function() {
                            process.exit(0);
                        }, 1000);
                    } else {
                        // Linux and Mac are more lenient, we can switch out files
                        // without many problems.
                        try {
                            fs.renameSync(applicationPath, applicationPath + ".prev");
                            fs.renameSync(dirName, applicationPath);
                            deleteFolderRecursive(outDir);
                            deleteFolderRecursive(applicationPath + ".prev");
                            this.close(true);
                        } catch (e) {
                            log("Failed to rename", e);
                        }
                    }
                });
            });
        }

        function deleteFolderRecursive(path) {
            var files = [];
            if (fs.existsSync(path)) {
                files = fs.readdirSync(path);
                files.forEach(function(file) {
                    var curPath = path + "/" + file;
                    if (fs.lstatSync(curPath).isDirectory()) { // recurse
                        deleteFolderRecursive(curPath);
                    } else { // delete file
                        fs.unlinkSync(curPath);
                    }
                });
                fs.rmdirSync(path);
            }
        }


        /**
         * Code taken from:
         * http://stackoverflow.com/questions/6832596/how-to-compare-software-version-number-using-js-only-number
         * copyright by Jon Papaioannou
         * This function is in the public domain. Do what you want with it, no strings attached.
         */
        function versionCompare(v1, v2, options) {
            var lexicographical = options && options.lexicographical,
                zeroExtend = options && options.zeroExtend,
                v1parts = v1.split('.'),
                v2parts = v2.split('.');

            function isValidPart(x) {
                return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
            }

            if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
                return NaN;
            }

            if (zeroExtend) {
                while (v1parts.length < v2parts.length) {
                    v1parts.push("0");
                }
                while (v2parts.length < v1parts.length) {
                    v2parts.push("0");
                }
            }

            if (!lexicographical) {
                v1parts = v1parts.map(Number);
                v2parts = v2parts.map(Number);
            }

            for (var i = 0; i < v1parts.length; ++i) {
                if (v2parts.length === i) {
                    return 1;
                }

                if (v1parts[i] === v2parts[i]) {
                    continue;
                } else if (v1parts[i] > v2parts[i]) {
                    return 1;
                } else {
                    return -1;
                }
            }

            if (v1parts.length !== v2parts.length) {
                return -1;
            }

            return 0;
        }

    }

}

exports.init = init;

exports.configZedrem = function(newServer) {
    if (!inited) {
        init();
    }
    if (currentSocketOptions.server !== newServer) {
        exports.initEditorSocket(newServer);
    }
};

exports.getSocketOptions = function() {
    return currentSocketOptions;
};

process.on('uncaughtException', function(err) {
    process.stdout.write('Caught exception: ' + err);
});
