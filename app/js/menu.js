define(function(require, exports, module) {
    plugin.consumes = ["eventbus", "command", "config", "editor", "tree"];
    plugin.provides = ["menu"];
    return plugin;

    function plugin(options, imports, register) {
        var eventbus = imports.eventbus;
        var command = imports.command;
        var editor = imports.editor;
        var tree = imports.tree;
        var config = imports.config;

        var menuEl;

        var menu = [{
            name: "File",
            items: [{
                name: "New",
                command: "File:New"
            }, {
                name: "Open (Goto)",
                command: "Navigate:Goto"
            }, {
                name: "Open (Tree)",
                command: "Navigate:File Tree"
            }, {}, {
                name: "Delete",
                command: "File:Delete"
            }, {
                name: "Rename",
                command: "File:Rename"
            }, {
                name: "Copy",
                command: "File:Copy"
            }, {}, {
                name: "Reload Filelist",
                command: "Navigate:Reload Filelist"
            }, {}, {
                name: "Close",
                command: "Window:Close"
            }]
        }, {
            name: "Edit",
            items: [{
                name: "Undo",
                command: "Edit:Undo"
            }, {
                name: "Redo",
                command: "Edit:Redo"
            }, {
                name: "Complete",
                command: "Edit:Complete"
            }, {
                name: "Multiple Cursors",
                items: [{
                    name: "Add At Next Instance",
                    command: "Cursor:Multiple:Add At Next Instance Of Identifier"
                }, {
                    name: "Add At Previous Instance",
                    command: "Cursor:Multiple:Add At Previous Instance Of Identifier"
                }, {
                    name: "Add Above",
                    command: "Cursor:Multiple:Add Above"
                }, {
                    name: "Add Below",
                    command: "Cursor:Multiple:Add Below"
                }, {
                    name: "Add Above Skip Current",
                    command: "Cursor:Multiple:Add Above Skip Current"
                }, {
                    name: "Add Below Skip Current",
                    command: "Cursor:Multiple:Add Below Skip Current"
                }, {
                    name: "Align cursors",
                    command: "Cursor:Multiple:Align cursors"
                }]
            }, {
                name: "Macro",
                items: [{
                    name: "Toggle Recording",
                    command: "Macro:Toggle Recording"
                }, {
                    name: "Replay",
                    command: "Macro:Replay"
                }]
            }, {}, {
                name: "Remove Line",
                command: "Edit:Remove Line"
            }, {
                name: "Toggle Comment",
                command: "Edit:Toggle Comment"
            }, {
                name: "Copy Lines Up",
                command: "Edit:Copy Lines Up"
            }, {
                name: "Move Lines Up",
                command: "Edit:Move Lines Up"
            }, {
                name: "Copy Lines Down",
                command: "Edit:Copy Lines Down"
            }, {
                name: "Move Lines Down",
                command: "Edit:Move Lines Down"
            }]
        }, {
            name: "Goto",
            items: [{
                name: "Anything",
                command: "Navigate:Goto"
            }, {
                name: "Line",
                command: "Navigate:Line"
            }, {
                name: "Path Under Cursor",
                command: "Navigate:Path Under Cursor"
            }, {}, {
                name: "Lookup Symbol",
                command: "Navigate:Lookup Symbol"
            }, {
                name: "Lookup Symbol In File",
                command: "Navigate:Lookup Symbol In File"
            }, {
                name: "Lookup Symbol Under Cursor",
                command: "Navigate:Lookup Symbol Under Cursor"
            }]
        }, {
            name: "Find",
            items: [{
                name: "Find",
                command: "Find:Find"
            }, {
                name: "Find Case Insensitive",
                command: "Find:Find Case Insensitive"
            }, {}, {
                name: "Next",
                command: "Find:Next"
            }, {
                name: "Previous",
                command: "Find:Previous"
            }, {
                name: "All",
                command: "Find:All"
            }, {}, {
                name: "Next Instance Of Identifier",
                command: "Find:Next Instance Of Identifier"
            }, {
                name: "Previous Instance Of Identifier",
                command: "Find:Previous Instance Of Identifier"
            }, {}, {
                name: "Find In Project",
                command: "Find:Find In Project"
            }]
        }, {
            name: "Split",
            items: [{
                name: "One",
                command: "Split:One"
            }, {
                name: "Vertical Two",
                command: "Split:Vertical Two"
            }, {
                name: "Vertical Three",
                command: "Split:Vertical Three"
            }, {
                name: "Preview",
                command: "Split:Preview"
            }, {}, {
                name: "Switch Focus",
                command: "Split:Switch Focus"
            }, {}, {
                name: "Move To First",
                command: "Split:Move To First"
            }, {
                name: "Move To Second",
                command: "Split:Move To Second"
            }, {
                name: "Move To Third",
                command: "Split:Move To Third"
            }]
        }, {
            name: "Tools",
            items: [{
                name: "Run Command",
                command: "Command:Enter Command"
            }, {}, {
                name: "Beautify",
                command: "Tools:Beautify"
            }, {
                name: "Preview",
                command: "Tools:Preview"
            }, {
                name: "Compile",
                command: "Tools:Compile"
            }, {
                name: "Document Stats",
                command: "Tools:Document Statistics"
            }, {}, {
                name: "Commit Changes",
                command: "Version Control:Commit"
            }, {
                name: "Reset Changes",
                command: "Version Control:Reset"
            }, {
                name: "Package Manager",
                command: "Tools:Zpm:Installed Packages"
            }, {
                name: "Reindex Project",
                command: "Tools:Index Project"
            }]
        }, {
            name: "Configuration",
            items: [{
                name: "Preferences",
                command: "Configuration:Preferences"
            }, {
                name: "Snippets",
                command: "Snippets:List"
            }, {
                name: "Themes",
                command: "Configuration:Preferences:Pick Theme"
            }, {}, {
                name: "Increase Font Size",
                command: "Configuration:Preferences:Increase Font Size"
            }, {
                name: "Decrease Font Size",
                command: "Configuration:Preferences:Decrease Font Size"
            }, {
                name: "Toggle Show Gutter",
                command: "Configuration:Preferences:Toggle Show Gutter"
            }, {
                name: "Toggle Show Invisibles",
                command: "Configuration:Preferences:Toggle Show Invisibles"
            }, {
                name: "Toggle Show Print Margin",
                command: "Configuration:Preferences:Toggle Show Print Margin"
            }, {
                name: "Toggle Word Wrap",
                command: "Configuration:Preferences:Toggle Word Wrap"
            }, {
                name: "Toggle Persistent Tree",
                command: "Configuration:Preferences:Toggle Persistent Tree"
            }, {
                name: "Toggle Menus",
                command: "Configuration:Preferences:Toggle Menus"
            }, {
                name: "Toggle Native Scroll Bars",
                command: "Configuration:Preferences:Toggle Native Scroll Bars"
            }, {
                name: "KeyBinding",
                items: [{
                    name: "Zed",
                    command: "Configuration:Preferences:KeyBinding:Zed"
                }, {
                    name: "Emacs",
                    command: "Configuration:Preferences:KeyBinding:Emacs"
                }, {
                    name: "Vim",
                    command: "Configuration:Preferences:KeyBinding:Vim"
                }]
            }, {
                name: "Reload",
                command: "Configuration:Reload"
            }]
        }, {
            name: "Window",
            items: [{
                name: "New",
                command: "Window:New"
            }, {
                name: "List",
                command: "Window:List"
            }, {}, {
                name: "Close",
                command: "Window:Close"
            }, {
                name: "Maximize",
                command: "Window:Maximize"
            }, {
                name: "Full Screen",
                command: "Window:Fullscreen"
            }, {
                name: "Minimize",
                command: "Window:Minimize"
            }]
        }, {
            name: "Help",
            items: [{
                name: "Introduction",
                command: "Help:Intro"
            }, {
                name: "Command Reference",
                command: "Help:Commands"
            }, {
                name: "View Log",
                command: "Help:View Log"
            }]
        }];

        var api = {
            disabled: false,
            hook: function() {
                eventbus.on("switchsession", function(edit, newSession) {
                    if (config.getPreference("showMenus")) {
                        api.updateMenu(newSession);
                    }
                });
                eventbus.on("configchanged", function() {
                    if (config.getPreference("showMenus")) {
                        console.log("Showing menus");

                        try {
                            api.updateMenu(editor.getActiveSession());
                        } catch (e) {
                            console.error("Error", e);
                        }
                        api.showMenu();
                    } else {
                        api.hideMenu();
                    }
                });
            },
            init: function() {
                menuEl = $("<div id='main-menu'>");
                $("body").append(menuEl);
                menuEl.on("click", "> ul > li > a", function() {
                    if(api.disabled) {
                        return;
                    }
                    menuEl.find("> ul > li > ul").removeClass("hidden");
                });
                menuEl.click(function(event) {
                    if (event.target.tagName === "A") {
                        var commandPath = $(event.target).parent().data("command");
                        if (commandPath) {
                            var edit = editor.getActiveEditor();
                            command.exec(commandPath, edit, edit.getSession());
                            api.hideSubMenus();
                        }
                    }
                });
                menuEl.hide();
            },
            hideSubMenus: function() {
                menuEl.find("> ul > li > ul").addClass("hidden");
            },
            updateMenu: function(session) {
                function treeToHtml(node) {
                    var html = '';
                    if (_.isArray(node)) {
                        html += "<ul>";
                        _.forEach(node, function(node) {
                            html += treeToHtml(node);
                        });
                        html += "</ul>";
                        return html;
                    } else if (node.name) {
                        html = "<li";
                        if (node.command) {
                            html += " data-command='" + node.command + "'";
                        }
                        if (node.items) {
                            html += " class='has-children'";
                        }
                        html += "><a href='#'>" + node.name;
                        if (node.command) {
                            var cmd = command.lookup(node.command);
                            if (!cmd || !command.isVisible(session, cmd)) {
                                return "";
                            }
                            var key = command.identifyCurrentKey(node.command);
                            if (key) {
                                html += "<span class='key'>" + key + "</span>";
                            }
                        }
                        html += "</a>";
                        if (node.items) {
                            html += treeToHtml(node.items);
                        }
                        html += "</li>";
                        return html;
                    } else {
                        // separator
                        return "<li class='separator'></li>";
                    }
                }
                var html = treeToHtml(menu);
                menuEl.html(html);
                api.hideSubMenus();
            },
            generateMenuJSON: function() {
                var commandTree = tree.buildDirectoryObject(command.allCommands(), ":");

                function treeToJson(path, nodeName, value) {
                    var node = {
                        name: path
                    };
                    if (nodeName) {
                        node.name = nodeName;
                        if (value === true) {
                            node.command = path.slice(1);
                        }
                    }
                    if (value !== true) {
                        node.items = [];
                        _.forEach(value, function(val, key) {
                            node.items.push(treeToJson(path + ":" + key, key, val));
                        });
                    }
                    return node;
                }

                var json = treeToJson("", null, commandTree);
                console.log(JSON5.stringify(json, null, 4));
            },
            showMenu: function() {
                console.log("Showing");
                if (!$("#editor-wrapper-wrapper").hasClass("top-menu")) {
                    $("#editor-wrapper-wrapper").addClass("top-menu");
                    $("#file-tree").css("top", "50px");
                    editor.resizeEditors();
                    menuEl.show();
                }
            },
            hideMenu: function() {
                if ($("#editor-wrapper-wrapper").hasClass("top-menu")) {
                    $("#editor-wrapper-wrapper").removeClass("top-menu");
                    $("#file-tree").css("top", "25px");
                    editor.resizeEditors();
                    menuEl.hide();
                }
            }
        };

        register(null, {
            menu: api
        });
    }
});
