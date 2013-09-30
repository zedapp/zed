require.config({
    baseUrl: "js",
    paths: {
        "text": "../dep/text"
    },
});

/*global $, chrome, _*/
require(["lib/history"], function(history) {
    var input = $("#gotoinput");

    function open(url) {
        chrome.app.window.create('editor.html?url=' + url + '&chromeapp=true', {
            frame: 'chrome',
            width: 720,
            height: 400,
        });
    }

    var defaultHint = $("#hint").html();

    function openChecked(url) {
        if(!url) {
            return;
        }
        // Only check http(s) links
        if (url.indexOf("http") !== 0) {
            input.val("");
            return open(url);
        }
        $.ajax({
            type: "POST",
            url: url,
            data: {
                action: 'version'
            },
            success: function() {
                open(url);
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

    function protocolIcon(url) {
        var protocol = url.split(":")[0];
        switch (protocol) {
            case "dropbox":
                return "img/dropbox.png";
            default:
                return "img/project.png";
        }
    }

    // We're storing recent projects in local storage
    var projectCache = [];

    function updateRecentProjects() {
        history.getProjects(function(err, projects) {
            if (_.isEqual(projects, projectCache)) {
                return;
            }
            var recentEl = $("#recent");
            recentEl.empty();
            projects.forEach(function(project) {
             var el = $("<a href='#'>");
             el.html("<img src='" + protocolIcon(project.url) + "'/>" + project.name);
             el.data("url", project.url);
             recentEl.append(el);
            });
            projectCache = projects;
            updateWindowSize();
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
        if (url) {
            open(url);
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
