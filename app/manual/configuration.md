Configuration
=============

Configuration of Zed happen in two primary locations:

1. The "Configuration" project which you can open from the Zed project picker.
2. A /zedconfig.json file in your project.

Zed implements configuration via an in-editor virtual file system that automatically synchronizes with Google Drive when connected to the Internet. As a result, your configuration is automatically synced between all your Chromes connected to your Google account. If you're interested, you can see the files by searching for them in your Drive:

    https://drive.google.com/#search/config%7C

There are file watchers on all imported config files, which reload the config whenever changes are made to a file. For instance, you can change the `theme` setting to something else and within a few seconds you see the colors of all your editor windows (on all your devices) change.

Zed's configuration consist of a number of aspects:

* Preferences: for configuring things like font size, theme, tabSize etc.
* Modes: for configuring language-specific support, e.g. for JavaScript, Go etc.
* Commands: Zed comes with about a hundred built-in commands, but new commands
            can also be implemented by the user.
* Keys: for defining mappings between key sequences and commands.
* Handlers: for responding to certain events and requests from the editor, e.g. session change
* Themes: defining Zed themes
* Packages: packages that need to be installed

Configuration is done in Zed's JSON format, which looks as follows:

    {
        "imports": [...],
        "preferences": {...},
        "modes": {...},
        "commands": {...},
        "keys": {...},
        "handlers": {...},
        "themes": {...},
        "packages": [...]
    }

Each key is optional.

Zed loads its configuration from two places:

1. If there exists a /zedconfig.json file in your project, it will load that
   first
2. /user.json in your Configuration project

Note that when a /zedconfig.json file is present in the project, those configs
take presedence over the ones defined in user.json in your Configuration
project.

Each config section will now be discussed separately.

Imports
-------

Zed config files have a simple importing mechanism. Each file specified in
the "imports" array will be loaded from the Configuration project, and combined
with the rest of the file. For instance, if I have this user.json file:

    {
        "imports": ["/morestuff.json"],
        "preferences": {
            "fontSize": 14
        },
        "modes": {
            "javascript": {
                "extensions": ["js"]
            }
        }
    }

and this /morestuff.json file:

    {
        "preferences": {
            "fontSize": 12,
            "showContextBar": true
        },
        "modes": {
            "javascript": {
                "extensions": ["es"]
            }
        }
    }

the config that I will end up effectively is:

    {
        "preferences": {
            "fontSize": 14,
            "showContextBar": true
        },
        "modes": {
            "javascript": {
                "extensions": ["js", "es"]
            }
        }
    }

So: objects are merged and arrays concatenated (without duplicate elements).

Preferences
-----------
Preferences can be set in multiple ways:

* Using commands, e.g. "Configuration:Preferences:Toggle Context Bar", these will automatically update the value in your /user.json file.
* By editing them by hand in your configuration JSON file

All available preferences and their default values can be found in the /default/preferences.json file in the Configuration project. They can all be overridden in your /user.json or zedconfig.json file or any file you import from there.

Modes
-----

Zed comes with a number of language-modes. These modes can be extended arbitrarily by adding to the "modes" section of a configuration.

Let's start with a simple new "zed" mode:

    {
        "modes": {
            "zed" : {
                "name": "Zed",
                "highlighter": "ace/mode/markdown",
                "extensions": ["zed"],

                "commands": {
                    "Tools:Check": {
                        "scriptUrl": "/user/mode/zed/check.js"
                    }
                },

                "handlers": {
                    "check": ["Tools:Check"]
                },

                "keys": {
                    "Tools:Check": "Ctrl-C"
                },

                "preferences": {
                    "fontSize": 20
                }
            }
        }
    }

As can be seen, in a mode we can define a few things:

* "name": defines the name of the mode (to appear in the command list)
* "highlighter": defines which ACE syntax highlighter to use, highlighters
  cannot at this time be defined in Zed itself.
* "extensions": the file extensions to use the mode for.
* "filenames": the filenames to use the mode for (e.g. "Makefile").
* "commands": custom commands specific to this mode (see the Commands section
  later in this document).
* "handlers": what handlers trigger a specific command automatically,
  currently the following handlers are supported:
  - "change": triggered when the text in a file changes (throttled every few
    seconds).
  - "preview": triggered when the Preview panel needs updating.
  - "check": triggered when static verification is requested, should return a list of annotations.
  - "complete": triggered when the user requests code completion, should return a list of possible completions.
  - "save": triggered when a file is being saved
  - "click": triggered when a location in a session is clicked
  - "index": triggered when a file is to be indexed (e.g. for symbols)
* "preferences": preference overrides specific to this mode.
* "keys": key overrides specific to this mode.

Commands
--------

In this section you can define custom commands. Each command is mapped to a JavaScript CommonJS module that is to return a simple function taking two arguments: options, and a callback to be called when completed.

Let's look at an example config:

    {
        "commands": {
            "My Commands:Summarize Document": {
                "scriptUrl": "/user/command/summarize.js",
                "length": "long",
                "inputs": {
                    "text": true
                }
            }
        }
    }

The scriptUrl specified can be any CommonJS module, loaded from anywhere (e.g. http, https). If the URL starts with a slash, it is assumed to be located in the Configuration project itself. If it starts with ./ it is assumed to be located in the same directory as the configuration file.

In our Configuration project we create a JavaScript file /user/command/summarize.js as follows to implement this command:

    var session = require("zed/session");

    module.exports = function(info) {
        var path = info.path;

        // 'zed' does not appear in the document
        if(info.inputs.text.indexOf("zed") === -1) {
            return session.setText(path, "Can't summarize, does not contain zed");
        } else {
            if(info.length === "long") {
                return session.setText(path, "Zed is super duper cool!");
            } else {
                return session.setText(path, "Zed is cool!");
            }
        }
    };

This defines a simple CommonJS module that imports one of Zed's sandbox APIs (sandbox.md) named "zed/session", which gives you access to open sessions (files). The module exports (returns) a function taking one argument (as all commands do): info: which contains everything specified in the body of the command spec, so in this case: a "scriptUrl" and "length" key, as well as an extra `path` key that specifies the path of the currently active file, as well as an `inputs` key that contains values for each of the requested inputs.

An input is an easy way to get quick access to common information, such as the full text of the file operating on, the cursor position, etc. Currently, the following "inputables" are available:

* text: the text of the current session as a single string
* lines: the contents of the current session as an array of strings representing lines
* preferences: to get all currently active preferences (for this session)
* cursor: to get the current cursor position ({row: ..., column: ...})
* cursorIndex: to get the current cursor position as a character index from the start of the document
* scrollPosition: the current scroll position
* selectionRange: the current selection range
* selectionText: the current selected text
* isInsertingSnippet: whether a snippet is currently being inserted

Commands are run in the Zed Sandbox (sandbox.md), which is running in a separate process for safety and safe code reloading reasons. As a result, you do not have access to all built-in Zed's core APIs. However, there is a growing number of specific APIs exposed to you (like the zed/session API in the example), check sandbox.md for more information.

If you make changes to your command's JavaScript and would like to reload, you can do so by running the "Sandbox:Reset" command.

For inspiration, it's useful to have a look at the commands defined under /default/mode/* in the Configuration project. Here you'll see that many of the features of Zed are implemented as sandboxed custom commands:

* On-the-fly checking of code (e.g. using jshint for JavaScript)
* Code beautification
* Preview rendering
* CTag providers
* Code completion

In fact, concepts like "checking" and "beautification" are not built-in Zed features at all, they're 100% defined using custom mode-specific sandboxed commands.

Keys
----

Keys specifications specify command name to keyboard shortcut mappings. Let's look at a snippet from /default/keys.json:

    {
        "keys": {
            "Select:To Line Start": {
                "mac": "Command-Shift-Left|Shift-Home",
                "win": "Alt-Shift-Left|Shift-Home"
            },
            "Select:Down": "Shift-Down",
        }
    }

The format is simple: the command names (either built-in or custom) are the keys, the values are either a shortcut key string, or if you want to have specific version for Mac and non-Mac platforms, a "mac" and "win" (which is also used for Linux) key. To provide multiple options, separate them with a pipe (|).

Modifier keys that are supported:

* Ctrl
* Alt
* Shift
* Command (Mac-specific)
* Option (Mac-specific)

And the following key names (as well as any upper case letter or number):

* Up
* Down
* Left
* Right
* PageUp
* PageDown
* Home
* End

Handlers
--------

To describe

Themes
------

To describe

Packages
--------

To describe
