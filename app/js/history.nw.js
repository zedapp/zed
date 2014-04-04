/*global chrome, define, _, zed*/
define(function(require, exports, module) {
    plugin.provides = ["history"];
    return plugin;

    function plugin(options, imports, register) {
        var api = {
            pushProject: function(name, url) {
                // Using setTimeout to wait for the whole architect app to the initialized
                // kind of hacky, but ok
                setTimeout(function pushIt() {
                    if(!window.zed) {
                        console.log("not Yet");
                        return setTimeout(pushIt, 500);
                    }
                    console.log("Pushing project", name, url);
                    var projects;
                    try {
                        projects = JSON.parse(localStorage.recentProjects);
                    } catch (e) {
                        projects = [];
                    }
                    var config = zed.getService("config");
                    // sanity check projects array
                    if (projects.length > 0 && !projects[0].url) {
                        projects = [];
                    }
                    var existing = _.where(projects, {
                        url: url
                    });
                    if (existing.length === 0) {
                        projects.splice(0, 0, {
                            name: name,
                            url: url
                        });
                        config.loadConfiguration(function() {
                            if (projects.length > config.getPreference("recentFolderHistory")) {
                                var numToRemove = projects.length - config.getPreference("recentFolderHistory");
                                projects.splice(projects.length - numToRemove, numToRemove);
                            }
                            localStorage.recentProjects = JSON.stringify(projects);
                        });
                    } else {
                        projects.splice(projects.indexOf(existing[0]), 1);
                        projects.splice(0, 0, {
                            name: existing[0].name,
                            url: url
                        });
                        localStorage.recentProjects = JSON.stringify(projects);
                    }
                }, 500);
            },
            renameProject: function(url, name, callback) {
                var projects;
                try {
                    projects = JSON.parse(localStorage.recentProjects);
                } catch (e) {
                    projects = [];
                }
                console.log("Projects", projects, url);
                var project = _.findWhere(projects, {
                    url: url
                });
                project.name = name;
                localStorage.recentProjects = JSON.stringify(projects);
                callback && callback();
            },
            removeProject: function(url, callback) {
                var projects;
                try {
                    projects = JSON.parse(localStorage.recentProjects);
                } catch (e) {
                    projects = [];
                }
                projects = _.filter(projects, function(project) {
                    return project.url !== url;
                });
                localStorage.recentProjects = JSON.stringify(projects);
                callback();
            },
            getProjects: function(callback) {
                var projects;
                try {
                    projects = JSON.parse(localStorage.recentProjects);
                } catch (e) {
                    projects = [];
                }
                callback(null, projects);
            },
            addProjectChangeListener: function(listener) {
                window.addEventListener('storage', listener, false);
            }
        };
        register(null, {
            history: api
        });
    }
});
