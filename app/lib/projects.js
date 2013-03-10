require.config({
    baseUrl: "lib",
    waitSeconds: 15
});

require([], function() {
    
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
        projects = projects || [];
        
        function renderProjects() {
            var projectsEl = $("#projects");
            projectsEl.empty();
            projects.forEach(function(project) {
                var el = $("<a href='#'>");
                el.text(project.name);
                el.click(function(event) {
                    var win = chrome.app.window.create('editor.html#' + project.url, {
                        frame: 'chrome',
                        width: 720,
                        height: 400
                    });
                    event.preventDefault();
                });
                projectsEl.append(el);
            });
        }
        
        renderProjects();
        
        $("#addform").submit(function(event) {
            projects.push({
                name: $("#name").val(),
                url: $("#url").val()
            });
            setKey("projects", projects);
            $("#name").val("");
            $("#url").val("http://");
            renderProjects();
            event.preventDefault();
        });
    });
});