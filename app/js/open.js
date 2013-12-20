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

/*global $, chrome, _*/
require(["lib/history", "lib/icons", "lib/async"], function(history, icons, async) {
    var input = $("#gotoinput");

    function open(url, title) {
        chrome.app.window.create('editor.html?url=' + url + "&title=" + title + '&chromeapp=true', {
            frame: 'chrome',
            width: 720,
            height: 400,
        });
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

    function close() {
        chrome.app.window.current().close();
    }

    function updateWindowSize() {
        var win = chrome.app.window.current();
        win.resizeTo(400, $("body").height() + 23);
    }

    // We're storing recent projects in local storage
    var projectCache = [];
    
    function updateRecentProjects() {
        history.getProjects(function(err, projects) {
            if (_.isEqual(projects, projectCache)) {
                return;
            }
            
            var validProjects = [];
            async.forEach(projects, function(project, next) {
                if(project.url.indexOf("local:") === 0) {
                    chrome.fileSystem.isRestorable(project.url.substring("local:".length), function(yes) {
                        if(yes) {
                            validProjects.push(project);
                        }
                        next();
                    });
                } else {
                    validProjects.push(project);
                    next();
                }
            }, function() {
                var recentEl = $("#recent");
                recentEl.empty();
                validProjects.forEach(function(project) {
                    var el = $("<a href='#'>");
                    el.html("<img src='" + icons.protocolIcon(project.url) + "'/>" + project.name);
                    el.data("url", project.url);
                    el.data("title", project.name);
                    recentEl.append(el);
                });
                projectCache = projects;
                updateWindowSize();
            });
            
        });
    }

    updateRecentProjects();
    chrome.storage.onChanged.addListener(updateRecentProjects);

    input.keyup(function(event) {
        if (event.keyCode == 13) {
            openChecked(input.val());
        }
    });

    $(window).keyup(function(event) {
        if (event.keyCode == 27) { // Esc
            close();
        }
    });

    try {
        var chromeVersion = parseInt(/Chrome\/(\d+)/.exec(navigator.userAgent)[1], 10);

        if (chromeVersion < 31) {
            $("#open-local").hide();
        }
    } catch (e) {}

    $("#projects").on("click", ".projects a", function(event) {
        var url = $(event.target).data("url");
        var title = $(event.target).data("title");
        if (url) {
            open(url, title);
        }
    });

    $("#dropbox-open").click(function() {
        chrome.app.window.create('dropbox/open.html', {
            frame: 'chrome',
            width: 600,
            height: 400,
        });
    });

    input.focus();
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