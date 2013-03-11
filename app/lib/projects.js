require.config({
    baseUrl: "lib",
    waitSeconds: 15
});

require(["fs/web", "fuzzyfind"], function(webfs, fuzzyfind) {
    
    function getKey(key, callback) {
        if(chrome.storage) {
            chrome.storage.sync.get(key, function(results) {
                callback(results[key]);
            });
        } else {
            callback(localStorage[key]);
        }
    }
    
    function setKey(key, value) {
        if(chrome.storage) {
            var obj = {};
            obj[key] = value;
            chrome.storage.sync.set(obj);
        } else {
            localStorage[key] = value;
        }
    }
    
    /*var projects = [
        {name: "FabEdit", url: "http://localhost:8080/server/php/?/fabedit"},
        {name: "Zed", url: "http://localhost:8080/server/php/?/zed/app"}
    ];*/
        
    getKey("projects", function(projects) {
        projects = projects || {};
        var input = $("#gotoinput");
        var resultsEl = $("#results");
        resultsEl.menu({
            select: function(event, ui) {
                event.preventDefault();
                open();
            }
        });
        
        function open() {
            var projectName = resultsEl.find("a.ui-state-focus").text();
            var project = projects[projectName];
            chrome.app.window.create('editor.html#' + project.url, {
                frame: 'chrome',
                width: 720,
                height: 400
            });
            chrome.app.window.current().close();
        }
        
        function renderProjects() {
            var allProjects = Object.keys(projects);
            resultsEl.empty();
            var matchingProjects = fuzzyfind(allProjects, input.val());
            matchingProjects.forEach(function(match) {
                var project = projects[match.path];
                var projectName = match.path;
                var el = $("<li>");
                var textEl = $("<a href='#'>");
                textEl.text(projectName);
                el.append(textEl);
                resultsEl.append(el);
            });
            resultsEl.menu("refresh");
            resultsEl.menu("next");
            input.focus();
        }
        
        renderProjects();
        input.keyup(function(event) {
            switch(event.keyCode) {
                case 27: // Esc
                    chrome.app.window.current().close();
                    break;
                case 38: // up
                    resultsEl.menu("previous");
                    break;
                case 40: // down
                    resultsEl.menu("next");
                    break;
                case 13: // Enter
                    open();
                case 9: // tab
                    break;
                default:
                    renderProjects();
            }
        });
        input.keydown(function(event) {
            switch(event.keyCode) {
                case 9: // Tab
                    if(event.shiftKey)
                        resultsEl.menu("previous");
                    else
                        resultsEl.menu("next");
                    event.preventDefault();
                    event.stopPropagation();
                    break;
            }
        });        
        
        $("#addform").hide().submit(function(event) {
            var name = $("#name").val();
            var url = $("#url").val();
            var io = webfs(url);
            $("#status").text("Testing...");
            io.writeFile("/__zedtest.txt", "testing", function(err) {
                if(err) {
                    return $("#status").text("Error: " + err);
                }
                io.readFile("/__zedtest.txt", function(err, result) {
                    if(err) {
                        return $("#status").text("Error: " + err);
                    }
                    if(result !== "testing") {
                        return $("#status").text("Invalid tet retrieved: " + result);
                    }
                    io.deleteFile("/__zedtest.txt", function(err) {
                        if(err) {
                            console.error("Could not delete test file:", err);
                        }
                    });
                    projects[name] = {
                        url: url
                    };
                    setKey("projects", projects);
                    $("#name").val("");
                    $("#url").val("http://");
                    renderProjects();
                    $("#status").text("OK. Added.");
                });
            })
            event.preventDefault();
        });
        $("#addbutton").click(function() {
            $("#addform").show();
            $("#addbutton").hide();
        });
    });

});