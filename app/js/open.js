require.config({
    baseUrl: "js",
    waitSeconds: 15
});

/*global $, chrome, _*/
$(function() {
    var input = $("#gotoinput");
    var hygienic = $("#hygienic");

    function open(url) {
        chrome.app.window.create('editor.html?url=' + url +
         (hygienic.is(":checked") ? "&hygienic=true" : "") + '&chromeapp=true', {
            frame: 'chrome',
            width: 720,
            height: 400,
        });
    }

    var defaultHint = $("#hint").html();

    function openChecked(url) {
        // Only check http(s) links
        if(url.indexOf("http") !== 0) {
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

    // We're storing recent projects in local storage
    var projectCache = [];
    function updateRecentProjects() {
        chrome.storage.local.get("recentProjects", function(results) {
            var projects = results.recentProjects || [];
            // sanity check projects array
            if(projects.length > 0 && !projects[0].url) {
                projects = [];
            }
            if(_.isEqual(projects, projectCache)) {
                return;
            }
            var recentEl = $("#recent");
            recentEl.empty();
            projects.forEach(function(project) {
                var el = $("<a href='#'>");
                var title = project.name || project.url.replace("http://localhost:7336/fs/local/", "");
                el.text(title);
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

    chrome.storage.sync.get("hygienicMode", function(results) {
        if(results.hygienicMode) {
            hygienic.attr("checked", "checked");
        }
    });

    hygienic.change(function() {
        chrome.storage.sync.set({hygienicMode: hygienic.is(":checked")});
    });

    $("#projects").on("click", ".projects a", function(event) {
        open($(event.target).data("url"));
    });

    input.focus();
    updateWindowSize();
});