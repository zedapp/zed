/*global analytics*/
define(function(require, exports, module) {
    "use strict";
    plugin.consumes = ["analytics_tracker", "eventbus"];
    plugin.provides = ["analytics"];
    return plugin;

    function plugin(options, imports, register) {
        var eventbus = imports.eventbus;
        var tracker = imports.analytics_tracker;

        var api = {
            hook: function() {
                eventbus.on("newfilecreated", function(path, session) {
                    if (session) {
                        tracker.trackEvent("Editor", "NewFile", session.mode.language);
                    }
                });

                eventbus.on("newsession", function(newSession) {
                    tracker.trackEvent("Editor", "OpenWithMode", newSession.mode.language);
                });

                var loadedFileList = false;

                eventbus.on("loadedfilelist", function() {
                    if (loadedFileList) {
                        // Only interested in seeing if people reload
                        // explicitly
                        tracker.trackEvent("Editor", "LoadedFileList");
                    }
                    loadedFileList = true;
                });

                var configLoaded = false;

                eventbus.on("configchanged", function() {
                    if (configLoaded) {
                        // Only interested in seeing that people actually
                        // change their config
                        tracker.trackEvent("Editor", "ConfigChanged");
                    }
                    configLoaded = true;
                });

                eventbus.on("goto", function(phrase) {
                    if (phrase[0] === "/") {
                        tracker.trackEvent("Editor", "Goto", "FullPath");
                    } else if (phrase[0] === ":" && phrase[1] === "/") {
                        tracker.trackEvent("Editor", "Goto", "FindInFile");
                    } else if (phrase[0] === ":" && phrase[1] === "@") {
                        tracker.trackEvent("Editor", "Goto", "LocalSymbol");
                    } else if (phrase[0] === ":") {
                        tracker.trackEvent("Editor", "Goto", "Line");
                    } else if (phrase[0] === "@") {
                        tracker.trackEvent("Editor", "Goto", "ProjectSymbol");
                    } else {
                        tracker.trackEvent("Editor", "Goto", "FilePattern");
                    }
                });

                eventbus.on("complete", function(edit) {
                    tracker.trackEvent("Editor", "Complete", edit.session.mode.language);
                });

                eventbus.on("tree", function() {
                    tracker.trackEvent("Editor", "Tree");
                });

                eventbus.on("commandtree", function() {
                    tracker.trackEvent("Editor", "CommandTree");
                });

                eventbus.on("executedcommand", function(cmd) {
                    tracker.trackEvent("Editor", "ExecuteCommand", cmd);
                });
            }
        };

        register(null, {
            analytics: api
        });

    }
});
