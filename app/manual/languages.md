Language modes
==============

Just like settings (settings.md), a language mode is a JSON file on the settings
filesystem (under `/mode/`) with a `default` and a `user` version. Here's what a
shortened version of `/mode/javascript.default.json` looks like:

    {
        "name": "JavaScript",
        "highlighter": "ace/mode/javascript",
        "extensions": ["js"],

        "tool:ctags": {
            "scriptUrl": "plugin/ctags/javascript.js"
        },

        "tool:check": {
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
        },

        "snippet:log": "console.log(${1})"
    }

The `name` should be self explanatory. The `highlighter` is a tricky one, for
now Zed won't offer real extensibility at this level, but only support any of
the current [ACE](http://ace.ajax.org) highlighters. If you want to add one,
contribute it to ACE and make more people happy.

The `tool:*` settings are used to implement various useful editor features:

* `check`: check this piece of code and give me back an array of errors and
  warnings (to be marked in the editor's gutter). There's currently
  implementations for JavasScript (based on JSHint), CSS (based on CSSLint) and
  JSON.
* `beautify`: reformat this piece of code.
* `preview`: render this piece of code into HTML for previewing (think:
  markdown, Coffeescript Javascript preview).
* `ctags`: analyze this piece of code and give me back a list of symbols (for
  navigation and completion)

In a tool object, you can specify:

* a `scriptUrl`, which can be a local path, or a remote URL of a
  [require.js](http://requirejs.org) module that exports a single function that
  implements the tool in question and returns the result.

In addition, snippets for completion can be specified with [multiple insertion
points](http://screencast.com/t/AYCwS0ZKE).

To develop your own tools, you can clone the Zed git repo and look in the
`/app/plugin` directory for examples. To test them, open `sandbox.html` in your
browser, which links to a simple playground for testing.

