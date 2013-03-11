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
            if(!projectName) {
                $("#addform").show();
                $("#url").focus();
                $("#hint").html("Press <tt>Enter</tt> to create.");
                return;
            }
            var project = projects[projectName];
            chrome.app.window.create('editor.html?url=' + project.url +
                                     '&username=' + project.username +
                                     '&password=' + project.password, {
                frame: 'chrome',
                width: 720,
                height: 400
            });
            close();
        }
        
        function remove() {
            var projectName = resultsEl.find("a.ui-state-focus").text();
            delete projects[projectName];
            setKey("projects", projects);
        }
        
        function close() {
            chrome.app.window.current().hide();
            // Reset UI for next showing
            $("#addform").hide();
            input.val("");
            renderProjects();
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
            if(matchingProjects.length > 0) {
                resultsEl.menu("next");
                $("#hint").html("Press <tt>Enter</tt> to <u>open</u> or <tt>Shift-Delete</tt> to <u>delete</u>.");
            } else {
                $("#hint").html("Press <tt>Enter</tt> to <u>create</u> project with this name.");
            }
            input.focus();
        }
        
        renderProjects();
        input.keyup(function(event) {
            console.log(event);
            switch(event.keyCode) {
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
                case 46: // Delete
                    if(event.shiftKey) {
                        remove();
                    }
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
        $(window).keyup(function(event) {
            if(event.keyCode == 27) { // Esc
                close();
            }
        });
        
        $("#addform").hide().submit(function(event) {
            var name = input.val();
            var url = $("#url").val();
            var username = $("#username").val() || undefined;
            var password = $("#password").val() || undefined;
            var io = webfs(url, username, password);
            $("#status").text("Verifying...");
            io.writeFile("/__zedtest.txt", "testing", function(err) {
                if(err) {
                    if(err.indexOf("Unauthorized") !== -1) {
                        $(".authenticate").fadeIn();
                        return $("#status").text("Provide username and password and try again.");
                    } else {
                        return $("#status").text("Error: " + err);
                    }
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
                        url: url,
                        username: username,
                        password: password
                    };
                    setKey("projects", projects);
                    $("#name").val("");
                    $("#url").val("http://");
                    $("#addform").hide();
                    renderProjects();
                    $("#status").text("OK. Added.");
                });
            })
            event.preventDefault();
        });
    });

});