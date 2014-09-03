define(function(require, exports, module) {
    plugin.consumes = ["eventbus", "history"];
    plugin.provides = ["open_ui"];
    return plugin;

    function plugin(options, imports, register) {
        var eventbus = imports.eventbus;
        var history = imports.history;

        var options = require("./lib/options");
        var icons = require("./lib/icons");
        var filterList = require("./lib/filter_list");

        eventbus.declare("urlchanged");

        var builtinProjects;

        if (window.isNodeWebkit) {
            builtinProjects = [{
                name: "Open Local Folder",
                url: "node:"
            }, {
                id: "github-open",
                name: "Open Github Repository",
                url: "gh:"
            }, {
                name: "Configuration",
                url: "nwconfig:"
            }, {
                name: "Manual",
                url: "manual:"
            }];
        } else {
            builtinProjects = [{
                name: "Open Local Folder",
                url: "local:"
            }, {
                id: "github-open",
                name: "Open Github Repository",
                url: "gh:"
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
            }];
        }

        var api = {
            init: function() {
                // setTimeout(function() {
                //     options.set("url", "config:");
                //     eventbus.emit("urlchanged");
                // }, 5000);
                var el = $("<div class='modal-view'><h1>Open</h1><input type='text' id='phrase' placeholder='Filter list'><div id='item-list'></div></div>");
                $("body").append(el);

                history.getProjects().then(function(projects) {
                    projects = builtinProjects.concat(projects);
                    console.log("All projects", projects);

                    var items = projects.map(function(project) {
                        return {
                            name: project.url,
                            title: project.name,
                            html: "<img src='" + icons.protocolIcon(project.url) + "'/>" + project.name
                        };
                    });

                    var phraseEl = $(".modal-view #phrase");
                    phraseEl.val("");
                    phraseEl.focus();
                    var listEl = $("#item-list");
                    filterList({
                        inputEl: phraseEl,
                        resultsEl: listEl,
                        list: items,
                        onSelect: function(b) {
                            console.log("Pick", b);
                            options.set("title", b.title);
                            options.set("url", b.name);
                            eventbus.emit("urlchanged");
                        },
                        onCancel: function() {
                            window.close();
                        }
                    });
                }, function(err) {
                    console.error("Error", err);
                });
            }
        };

        register(null, {
            open_ui: api
        });
    }
});
