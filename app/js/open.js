/*global $, chrome, _*/

/**
 * This module implements Zed's open screen, with project picker etc.
 * TODO: Clean this up
 */
require.config({
    baseUrl: "js",
    paths: {
        "text": "../dep/text"
    },
});

require(["lib/history", "lib/icons", "lib/async", "lib/key_code"], function(history, icons, async, keyCode) {
    var remoteEditInput = $("#gotoinput");
    var filterInput = $("#projectfilter");
    var defaultHint = $("#hint").html();
    
    var selectIdx = 0;
    // Keeps references to open project's Chrome windows
    var openProjects = {};
    // We're storing recent projects in local storage
    var projectCache = null;
    var validProjectCache = null;
    
    var backgroundPage = null;
    
    chrome.runtime.getBackgroundPage(function(bg) {
        backgroundPage = bg;
        openProjects = backgroundPage.projects;
    });

    function open(url, title) {
        var openProject = openProjects[url];
        if(openProject && !openProject.contentWindow.window) {
            // Window was close and we weren't notified
            delete openProjects[url];
        }
        if(openProject) {
            openProject.focus();
        } else {
            chrome.app.window.create('editor.html?url=' + url + "&title=" + title + '&chromeapp=true', {
                frame: 'chrome',
                width: 720,
                height: 400,
            }, function(win) {
                if(url !== "dropbox:" && url !== "local:") {
                    openProjects[url] = win;
                    win.onClosed.addListener(function() {
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
            remoteEditInput.val("");
            return open(url, url);
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
                $("#hint").html("<span class='error'>ERROR</span>: URL does seem to run a (recent) Zed server.");
                setTimeout(function() {
                    $("#hint").html(defaultHint);
                }, 5000);
            },
            dataType: "text"
        });
    }

    function updateWindowSize() {
        var win = chrome.app.window.current();
        win.resizeTo(400, $("body").height() + 23);
    }
    
    function getAllVisibleProjects() {
        var projects = validProjectCache.slice();
        var filterPhrase = filterInput.val().toLowerCase();
        projects.splice(0, 0, {
            name: "Open Local Folder",
            url: "local:"
        }, {
            id: "dropbox-open",
            name: "Open Dropbox Folder",
            url: "dropbox:"
        }, {
            name: "Notes",
            url: "syncfs:",
        }, {
            name: "Configuration",
            url: "config:"
        }, {
            name: "Manual",
            url: "manual:"
        });
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
            if(project.id) {
                el.attr("id", project.id);
            }
            el.html("<img src='" + icons.protocolIcon(project.url) + "'/>" + project.name);
            el.data("url", project.url);
            el.data("title", project.name);
            el.data("idx", idx);
            if(idx === selectIdx) {
                el.addClass("active");
            }
            recentEl.append(el);
        });
        updateWindowSize();
        return projects;
    }

    function updateRecentProjects(callback) {
        history.getProjects(function(err, projects) {
            if (_.isEqual(projects, projectCache)) {
                return;
            }

            var validProjects = [];
            async.forEach(projects, function(project, next) {
                if (project.url.indexOf("local:") === 0) {
                    chrome.fileSystem.isRestorable(project.url.substring("local:".length), function(yes) {
                        if (yes) {
                            validProjects.push(project);
                        }
                        next();
                    });
                } else {
                    validProjects.push(project);
                    next();
                }
            }, function() {
                validProjectCache = validProjects;
                updateProjectList();
                _.isFunction(callback) && callback();
            });
        });
    }

    updateRecentProjects();
    chrome.storage.onChanged.addListener(updateRecentProjects);

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

    filterInput.keydown(function(event) {
        switch(event.keyCode) {
            case keyCode('Return'):
                var projects = updateProjectList();
                if(projects.length > 0) {
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
                if(event.shiftKey) {
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
            chrome.app.window.create('dropbox/open.html', {
                frame: 'chrome',
                width: 600,
                height: 400,
            });
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

    filterInput.focus();
    updateWindowSize();
});

window.focusMe = function() {
    // chrome.app.window.current().drawAttention();
    chrome.app.window.current().focus();
};