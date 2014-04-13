/*global define, $, chrome, _*/
define(function(require, exports, module) {
    plugin.consumes = ["history", "window", "windows"];
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
            open: open
        };

        windows.setOpenWindow();

        function open(url, title, filename) {
            var openProject = openProjects[url];
            if (openProject && !openProject.window) {
                // Window was close and we weren't notified
                delete openProjects[url];
            }
            if (openProject) {
                openProject.focus();
            } else {
                win.create(editorHtml + '?url=' + url + "&title=" + title + (filename ? "&filename=" + filename : ""), 'none', 720, 400, function(err, win) {
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

        function updateRecentProjects(callback) {
            console.log("Updating project list");
            history.getProjects(function(err, projects) {
                if (_.isEqual(projects, projectCache)) {
                    return;
                }

                validProjectCache = projects;
                updateProjectList();
                _.isFunction(callback) && callback();
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
                    return history.removeProject(url, function() {
                        updateRecentProjects(function() {
                            selectIdx = Math.min(getAllVisibleProjects().length - 1, selectIdx);
                            updateProjectSelection();
                        });
                    });
            }
            updateProjectSelection();
        });

        function updateProjectSelection() {
            var projectEls = $(".projects a");
            projectEls.removeClass("active");
            projectEls.eq(selectIdx).addClass("active");
        }

        $("#projects").on("click", ".projects a", function(event) {
            var url = $(event.target).data("url");
            var title = $(event.target).data("title");
            if (url === "dropbox:") {
                win.create('dropbox/open.html', 'chrome', 600, 400);
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
    }

});
