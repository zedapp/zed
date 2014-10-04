/*global chrome, define, _, zed*/
define(function(require, exports, module) {
    plugin.provides = ["history"];
    return plugin;

    function plugin(options, imports, register) {
        var async = require("./lib/async");

        var api = {
            pushProject: function(name, url) {
                // Using setTimeout to wait for the whole architect app to the initialized
                // kind of hacky, but ok
                setTimeout(function pushIt() {
                    console.log("Pushing project", name, url);
                    chrome.storage.local.get("recentProjects", function(results) {
                        var config = zed.getService("config");
                        var projects = results.recentProjects || [];
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
                            config.loadConfiguration().then(function() {
                                if (projects.length > config.getPreference("recentFolderHistory")) {
                                    var numToRemove = projects.length - config.getPreference("recentFolderHistory");
                                    projects.splice(projects.length - numToRemove, numToRemove);
                                }
                                chrome.storage.local.set({
                                    recentProjects: projects
                                });
                            });
                        } else {
                            projects.splice(projects.indexOf(existing[0]), 1);
                            projects.splice(0, 0, {
                                name: existing[0].name,
                                url: url
                            });
                            chrome.storage.local.set({
                                recentProjects: projects
                            });
                        }
                    });
                }, 500);
            },
            renameProject: function(url, name) {
                return new Promise(function(resolve) {
                    chrome.storage.local.get("recentProjects", function(results) {
                        var projects = results.recentProjects || [];
                        var project = _.findWhere(projects, {
                            url: url
                        });
                        project.name = name;
                        chrome.storage.local.set({
                            recentProjects: projects
                        }, resolve);
                    });
                });
            },
            removeProject: function(url) {
                return new Promise(function(resolve) {
                    chrome.storage.local.get("recentProjects", function(results) {
                        var projects = results.recentProjects || [];
                        projects = _.filter(projects, function(project) {
                            return project.url !== url;
                        });
                        chrome.storage.local.set({
                            recentProjects: projects
                        }, resolve);
                    });
                });
            },
            lookupProjectByUrl: function(url) {
                return api.getProjects().then(function(projects) {
                    var project = _.findWhere(projects, {
                        url: url
                    });
                    return project;
                });
            },
            getProjects: function() {
                return new Promise(function(resolve, reject) {
                    chrome.storage.local.get("recentProjects", function(results) {
                        var projects = results.recentProjects || [];
                        // sanity check projects array
                        if (projects.length > 0 && !projects[0].url) {
                            projects = [];
                        }
                        var validProjects = [];
                        Promise.all(projects.map(function(project) {
                            if (project.url.indexOf("local:") === 0) {
                                chrome.fileSystem.isRestorable(project.url.substring("local:".length), function(yes) {
                                    if (yes) {
                                        validProjects.push(project);
                                    }
                                });
                            } else {
                                validProjects.push(project);
                            }
                        })).then(function() {
                            resolve(projects);
                        }, reject);
                    });
                });
            },
            addProjectChangeListener: function(listener) {
                chrome.storage.onChanged.addListener(listener);
            }
        };
        register(null, {
            history: api
        });
    }
});
