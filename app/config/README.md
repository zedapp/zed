Zed Configuration
=================
Welcome to Zed's configuration system, which is the easiest way to customize your Zed experience. To get started open `user.json` (it may be on the right already). This is the location where you can override and extend Zed's default config. It conists of a few sections:

    {
        "imports": [
            "/default.json"
        ],
        "preferences": {},
        "modes": {},
        "keys": {},
        "commands": {},
        "handlers": {},
        "themes": {}
    }

* `imports` is a system to import other configuration files inside the Configuration project, by default it imports `/default.json`, which in turn imports a bunch of other files (have a look).
* `preferences` is where you can override basic preferences like `fontSize`, `theme` etc. To see all preferences and their default values, have a look at `/default/preferences.json`.
* `modes` is where you can add or customize language modes. For instance, to define a new JavaScript snippet (the JavaScript mode is defined in `/default/mode/javascript.json`), you can do so as follows:

        "modes": {
            "javascript": {
            "commands": {
                "Tools:Complete:Snippet": {
                    "snippets": {
                        "mysnippet": "doSomethingCool(${1:yo})"
                    }
                }
            }
        },

    This may seem confusing, but if you look at the default JavaScript mode definition, you'll see that the above code exactly mirrors part of the default JavaScript mode definition and the import system merges the two on the fly.
* `keys` is where you add/override command name to keyboard shortcut settings. For instance, to add a keyboard shortcut for the `Navigate:Reload Filelist` command:

        "keys": {
            "Navigate:Reload Filelist": "Ctrl-R"
        },

* `commands` is where you can define custom commands. Custom commands are implemented in JavaScript and their source code reside inside the Configuration project as well. Look at some language modes (e.g. the JavaScript one) for some examples.
* `handlers` is where certain events, e.g. a file is changed, preview is requested, code complete is requested are mapped to (custom) commands to be executed, this is how code completion, CTag indexing is implemented in Zed.
* `themes` is where themes are defined. For the default themes have a look at the `/default/themes.json` file. Essentially they're a simple JSON object with a link to a CSS file (also stored in the Configuration project).

Note that everything under `/default` is read-only. To change any of those values you override them in `/user.json` as described above.

For more information check `/configuration.md` in the Manual project.

Have fun customizing!
