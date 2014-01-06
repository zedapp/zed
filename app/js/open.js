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

require(["lib/history", "lib/icons", "lib/async"], function(history, icons, async) {
    var input = $("#gotoinput");

    var filterInput = $("#projectfilter");
    
    var openProjects = {};
    window.openProjects = openProjects;

    function open(url, title) {
        var openProject = openProjects[url];
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

    var defaultHint = $("#hint").html();

    function openChecked(url) {
        if (!url) {
            return;
        }
        // Only check http(s) links
        if (url.indexOf("http") !== 0) {
            input.val("");
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
                input.val("");
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

    // We're storing recent projects in local storage
    var projectCache = [];
    var validProjectCache = [];

    function updateProjectList() {
        var projects = validProjectCache.slice();
        var recentEl = $("#recent");
        var filterPhrase = filterInput.val().toLowerCase();
        recentEl.empty();
        projects.splice(0, 0, {
            name: "Local Folder",
            url: "local:"
        }, {
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
        projects.forEach(function(project) {
            var el = $("<a href='#'>");
            el.html("<img src='" + icons.protocolIcon(project.url) + "'/>" + project.name);
            el.data("url", project.url);
            el.data("title", project.name);
            recentEl.append(el);
        });
        updateWindowSize();
        return projects;
    }

    function updateRecentProjects() {
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
            });
        });
    }

    updateRecentProjects();
    chrome.storage.onChanged.addListener(updateRecentProjects);

    input.keyup(function(event) {
        if (event.keyCode === 13) {
            openChecked(input.val());
        }
    });

    filterInput.keyup(function(event) {
        var projects = updateProjectList();
        if(event.keyCode === 13 && projects.length > 0) {
            $(".projects a").eq(0).click();
            filterInput.val("");
        }
    });

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
    });

    filterInput.focus();
    updateWindowSize();

    // Hide dropbox option for non-registered oAuth ids:
    var dropboxOauthAppId = ["fkjcgamnceomfnbcaedlhhopcchmnlkj",
        "pfmjnmeipppmcebplngmhfkleiinphhp"];
    if (dropboxOauthAppId.indexOf(chrome.runtime.id) === -1) {
        $("#dropbox-open").hide();
    }
});

window.focusMe = function() {
    // chrome.app.window.current().drawAttention();
    chrome.app.window.current().focus();
};