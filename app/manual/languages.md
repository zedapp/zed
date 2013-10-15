Language modes
==============

Just like settings (settings.md), a language mode is a JSON file on the settings
filesystem (under `/mode/`) with a `default` and a `user` version. Here's what a
shortened version of `/mode/javascript.default.json` looks like:

    {
        "name": "JavaScript",
        "highlighter": "ace/mode/javascript",
        "extensions": ["js"],

        "commands": {
            "Tools:CTags": {
                "scriptUrl": "plugin/ctags/javascript.js"
            },
            "Tools:Check": {
                "scriptUrl": "plugin/check/javascript.js",
                "options": {
                    "undef": true,
                    "unused": true,
                    "es5": true,
                    "esnext": true,
                    "devel": true,
                    "browser": true,
                    "node": true,
                    "laxcomma": true,
                    "laxbreak": true,
                    "lastsemic": true,
                    "onevar": false,
                    "passfail": false,
                    "maxerr": 100,
                    "expr": true,
                    "multistr": true,
                    "globalstrict": true
                }
            }
        },

        "events": {
            "change": ["Tools:CTags", "Tools:Check"]
        },

        "snippets": {
            "log": "console.log(${1})"
        }
    }

The `name` should be self explanatory. The `highlighter` is a tricky one, for
now Zed won't offer real extensibility at this level, but only support any of
the current [ACE](http://ace.ajax.org) highlighters. If you want to add one,
contribute it to ACE and make more people happy.

The `commands` object defines Zed commands specific to this mode. In the example
two such commands are defined `Tools:CTags` and `Tools:Check`. These are implemented
as sandboxed scripts and can be invoked like any other command for files using this
mode.

The `events` object allows you to automatically trigger commands on certain events.
Currently the following events are supported:

* `change`: when the text in a session has changed
* `preview`: when a preview is requested

These events only apply to files with this mode, of course.

The `snippets` object defines snippets supported in this mode where `${1}` etc. are
place holders.