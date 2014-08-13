/*global define, $, chrome, _*/
define(function(require, exports, module) {
    plugin.consumes = ["history", "window", "windows", "config", "eventbus", "analytics_tracker", "token_store"];
    plugin.provides = ["open"];
    return plugin;

    /**
     * As before, the open plugin is still super crude and has many Chrome-specific hooks
     * that I'll have to remove soon
     */

    function plugin(options, imports, register) {
        var icons = require("lib/icons");
        var keyCode = require("lib/key_code");

        var history = imports.history;
        var win = imports.window;
        var windows = imports.windows;
        var config = imports.config;
        var analytics_tracker = imports.analytics_tracker;
        var eventbus = imports.eventbus;
        var tokenStore = imports.token_store;

        var builtinProjects = options.builtinProjects;
        var editorHtml = options.editorHtml;

        var remoteEditInput = $("#gotoinput");
        var filterInput = $("#projectfilter");
        var defaultHint = $("#hint").html();

        var selectIdx = 0;
        // Keeps references to open project's Chrome windows
        var openProjects = windows.openProjects;
        // We're storing recent projects in local storage
        var projectCache = null;
        var validProjectCache = null;

        var api = {
            open: open,
            init: function() {
                checkAnalyticsAllowed();
            }
        };

        windows.setOpenWindow();

        analytics_tracker.trackEvent("Application", "Open");

        function open(url, title, filename) {
            var openProject = openProjects[url];
            try {
                if (openProject && !openProject.window) {
                    // Window was close and we weren't notified
                    delete openProjects[url];
                    openProject = null;
                }
            } catch (e) {
                // accessing openProject.window sometimes raises an error,
                // which means the window was closed
                delete openProjects[url];
                openProject = null;
            }
            if (openProject) {
                openProject.focus();
            } else {
                win.create(editorHtml + '?url=' + encodeURIComponent(url) + "&title=" + encodeURIComponent(title) + (filename ? "&filename=" + encodeURIComponent(filename) : ""), 'none', 720, 400).then(function(win) {
                    if (url !== "dropbox:" && url !== "local:") {
                        openProjects[url] = win;
                        win.addCloseListener(function() {
                            delete openProjects[url];
                        });
                    }
                });
            }
        }

        /**
         * Same as open, but first checks for a valid WebFS implementation in case of http/https links
         */
        function openChecked(url) {
            if (!url) {
                return;
            }
            url = url.trim();

            // Only check http(s) links
            if (url.indexOf("http") !== 0) {
                $("#hint").html("<span class='error'>ERROR</span>: URL does not seem to run a (recent) Zed server.");
                return;
            }
            $.ajax({
                type: "POST",
                url: url,
                data: {
                    action: 'version'
                },
                success: function() {
                    open(url, url);
                    remoteEditInput.val("");
                },
                error: function() {
                    $("#hint").html("<span class='error'>ERROR</span>: URL does not seem to run a (recent) Zed server.");
                    setTimeout(function() {
                        $("#hint").html(defaultHint);
                    }, 5000);
                },
                dataType: "text"
            });
        }

        function updateWindowSize() {
            win.setBounds({
                width: 400,
                height: $("body").height() + 23
            });
        }

        function getAllVisibleProjects() {
            var projects = validProjectCache.slice();
            var filterPhrase = filterInput.val().toLowerCase();
            projects.splice.apply(projects, [0, 0].concat(builtinProjects));
            projects = projects.filter(function(p) {
                return p.name.toLowerCase().indexOf(filterPhrase) !== -1;
            });
            return projects;
        }

        function updateProjectList() {
            var projects = getAllVisibleProjects();
            var recentEl = $("#recent");
            recentEl.empty();

            projects.forEach(function(project, idx) {
                var el = $("<a href='#'>");
                if (project.id) {
                    el.attr("id", project.id);
                }
                el.html("<img src='" + icons.protocolIcon(project.url) + "'/>" + project.name);
                el.data("url", project.url);
                el.data("title", project.name);
                el.data("idx", idx);
                if (idx === selectIdx) {
                    el.addClass("active");
                }
                recentEl.append(el);
            });
            setTimeout(function() {
                updateWindowSize();
            });
            return projects;
        }

        function updateRecentProjects() {
            console.log("Updating project list");
            return history.getProjects().then(function(projects) {
                if (_.isEqual(projects, projectCache)) {
                    return;
                }

                validProjectCache = projects;
                updateProjectList();
            });
        }

        updateRecentProjects();
        history.addProjectChangeListener(updateRecentProjects);

        remoteEditInput.keyup(function(event) {
            if (event.keyCode === 13) {
                openChecked(remoteEditInput.val());
            }
        });
        remoteEditInput.blur(function() {
            filterInput.focus();
        });

        var lastFilterPhrase = null;

        filterInput.keyup(function() {
            if (lastFilterPhrase != filterInput.val()) {
                selectIdx = 0;
                lastFilterPhrase = filterInput.val();
                updateProjectList();
            }
        });

        $("body").keydown(function(event) {
            if (event.target === remoteEditInput[0]) {
                return;
            }
            switch (event.keyCode) {
                case keyCode('Return'):
                    var projects = updateProjectList();
                    if (projects.length > 0) {
                        $(".projects a").eq(selectIdx).click();
                        filterInput.val("");
                        updateProjectList();
                        event.preventDefault();
                    }
                    break;
                case keyCode('Up'):
                    selectIdx = Math.max(0, selectIdx - 1);
                    break;
                case keyCode('Down'):
                    selectIdx = Math.min(getAllVisibleProjects().length - 1, selectIdx + 1);
                    break;
                case keyCode('Tab'):
                    if (event.shiftKey) {
                        // Up
                        selectIdx = Math.max(0, selectIdx - 1);
                    } else {
                        // Down
                        selectIdx = Math.min(getAllVisibleProjects().length - 1, selectIdx + 1);
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    break;
                case keyCode('Esc'):
                    filterInput.val("");
                    updateProjectList();
                    break;
                case keyCode('Delete'):
                    var selectedEl = $(".projects a").eq(selectIdx);
                    var url = selectedEl.data("url");
                    return history.removeProject(url).then(function() {
                        return updateRecentProjects();
                    }).then(function() {
                        selectIdx = Math.min(getAllVisibleProjects().length - 1, selectIdx);
                        updateProjectSelection();
                    });
            }
            updateProjectSelection();
        });

        function updateProjectSelection() {
            var projectEls = $(".projects a");
            projectEls.removeClass("active");
            projectEls.eq(selectIdx).addClass("active");
        }

        function checkAnalyticsAllowed() {
            config.loadConfiguration().then(function() {
                var enable = config.getPreference("enableAnalytics");
                var showMenus = config.getPreference("showMenus");
                if (enable === undefined || showMenus === undefined) {
                    win.create("firstrun.html", 'chrome', 800, 600);
                }
            });
        }

        function showGithubTokenWindow() {
            win.create('github/set_token.html', 'chrome', 600, 400);
        }

        function openGithubPicker(token) {
            console.log("TOken", token);
            win.create("github/open.html?token=" + token, 'chrome', 600, 400);
        }

        window.setPreference = function(name, val) {
            config.setPreference(name, val);
        };

        window.openManual = function() {
            open("manual:", "Manual");
        };

        window.openProject = function(title, url) {
            open(url, title);
        };

        window.setToken = function(name, value) {
            tokenStore.set(name, value).then(function() {
                openGithubPicker(value);
            });
        }

        $("#projects").on("click", ".projects a", function(event) {
            var url = $(event.target).data("url");
            var title = $(event.target).data("title");
            if (url === "dropbox:") {
                win.create('dropbox/open.html', 'chrome', 600, 400);
            } else if (url === "gh:") {
                tokenStore.get("githubToken").then(function(val) {
                    if (!val) {
                        showGithubTokenWindow();
                    } else {
                        openGithubPicker(val);
                    }
                })
            } else if (url) {
                open(url, title);
            }
            filterInput.focus();
        });

        $("#projects").on("mouseover", ".projects a", function(event) {
            var idx = $(event.target).data("idx");
            selectIdx = idx;
            updateProjectSelection();
        });

        $.getJSON("manifest.json", function(manifest) {
            $("#zed-version").text("You are running Zed version " + manifest.version);
        });

        filterInput.focus();
        updateWindowSize();

        window.focusMe = function() {
            win.focus();
        };

        register(null, {
            open: api
        });

        // Editor socket
        // TODO: Factor this out somehow
        var timeOut = 2000;
        var reconnectTimeout = null;
        var pingInterval = null;
        var pongTimeout = null;
        var editorSocketConn;
        var currentSocketOptions = {};

        var zedremStatusEl = $("#zedrem-status");

        function initEditorSocket() {
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

            tokenStore.get("zedremUserKey").then(function(userKey) {
                if (!userKey) {
                    userKey = createUUID();
                    tokenStore.set("zedremUserKey", userKey);
                }
                currentSocketOptions = {
                    server: config.getPreference("zedremServer"),
                    userKey: userKey
                };
                editorSocket(currentSocketOptions);
            });
        }


        eventbus.on("configchanged", function() {
            if (config.getPreference("zedremServer") === currentSocketOptions.server) {
                return;
            }
            console.log("Config changed.");
            closeSocket();
            initEditorSocket();
        });

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
            zedremStatusEl.text("Connecting to " + zedremConfig.server);
            editorSocketConn = new WebSocket(zedremConfig.server + '/editorsocket');
            editorSocketConn.onopen = function() {
                console.log("Connected to zedrem server!");
                zedremStatusEl.text("Connected to " + zedremConfig.server + "!");
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
                        initEditorSocket();
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
                            openChecked(url);
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
                zedremStatusEl.text("Couldn't connect to " + zedremConfig.server + ", retrying in " + (timeOut / 1000) + " seconds");
                reconnectTimeout = setTimeout(function() {
                    editorSocket(zedremConfig);
                }, timeOut);
            }
        }
    }

});
