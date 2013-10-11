Custom commands
===============

You can define your own custom commands written in JavaScript. These can be
hosted in the Zed app itself (e.g. in the app/plugin/command directory), or
on any server anywhere loadable via HTTP. To do this,
add an entry to /commands.users.json in your settings. Each command is specified
as follows:

    "Command:Name": {
        "scriptUrl": "http://bla.js",
        "readOnly": true, // Works in readOnly mode
    }

The script should be a require.js module that exports a single function that
takes two arguments:

* data: containing information about the document you're editing, its contents,
  cursor positions etc (more later)
* callback: which takes two arguments: `err` and `instructions`

Request data
============

The `data` argument to your function will receive a JSON object of the following
form:

    {
        path: "/path/to/file.txt",
        lines: ["Document content", "lines"],
        cursorPos, {row: 0, column: 0},
        selection: {
            text: "selectedText",
            start: {row: 0, column: 0},
            end: {row: 0, column: 0},
        }
    }

Response instructions
======================

You can call the callback function with `null` as first argument and as a second
argument an array of:

    {
        "type": "instruction type",
        <<instruction specific options>>
    }

Supported are:

    {
        "type": "replaceText",
        "what": "document|selection",
        "content": "Text to replace it with"
    }

Example custom command: uppercase
=================================

Here is the full code of a simple uppercase command, which will uppercase the
selection, or if nothing is selected the entire document:

    define(function(require, exports, module) {
        return function(data, callback) {
            if (!data.selection.text) {
                callback(null, [{
                    "type": "replaceText",
                    "what": "document",
                    "content": data.lines.join("\n").toUpperCase()
                }]);
            } else {
                callback(null, [{
                    "type": "replaceText",
                    "what": "selection",
                    "content": data.selection.text.toUpperCase()
                }]);
            }
        };
    });

To register this command, add to /commands.user.json object:

    "My Commands:Uppercase": {
        "scriptUrl": "http://myserver.com/uppercase.js"
    }

And press `Command-.`/`Ctrl-.` to execute it. After you make changes to
source code, run the "Sandbox:Reset" command in Zed to have your plugin file
be reloaded next time.

Developing commands
===================

To make developing commands easier, Zed comes with a debugger tool. For this
you need a Zed checkout and a static file server running serving files from the
app/ directory, e.g.:

    cd app
    python -m SimpleHTTPServer

Then, load http://localhost:8000/sandbox.html and click the "Switch to test mode"
link. Enter the plugin URL and a test file to operate on, also check the "Command"
checkbox. Then click the "Test" button to test, the changes will be applied to
the editor immediately and the JSON structions will be displayed in the box below.