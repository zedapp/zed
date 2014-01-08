Zed Editor Architecture
=======================

Here are a few core concepts worth discussing:

* Booting the editor
* Eventbus
* Commands

Booting the editor
==================

The main editor file is `app/editor.html` which loads a few dependency libraries (e.g. require.js, jQuery, ACE and underscore.js) and the loads the main application entry point: `app/js/boot.js`.

`boot.js` implements a very basic plugin system. It lists a number of editor modules and will invoke the `.hook()` method on each (if available), and then iterate over the module list again and invoke the `.init()` method (if available). Generally, the `hook` and `init` methods should be used as follows:

* hook: subscribe to eventbus events and handle them accordingly
* init: initialize whatever needs intitializing, e.g. create the UI (update the DOM), perform AJAX requests etc.

After both `.hook()` and `.init()` is invoked on all modules, Zed is considered to be booted. The rest is handled asynchronously via eventbus events.

Eventbus
========

The eventbus is a central event dispatch mechanism. Modules can declare events on the eventbus and emit them or listen on events. Generally every module should declare all its events at the top of the module file. Some events include:

* configchanged: triggered when the user has changed Zed's configuration
* configavailable: triggered when the configuration has been first loaded
* switchsession: trigger when an editor switches between sessions
* newfilecreated: triggered when a new file was created by the user
* sessionchanged: triggered when the session content (= code in a file) has been changed

Events may pass on extra values to the callback functions or not, this is specific to the event.

Commands
========

Almost all user actions are executed through commands. The base implementation of commands can be found `app/js/command.js`. Commands are defined all over the code base, usually organized by module. A command can be defined by importing the command module and invoking `define` on it:

    var command = require("./command");
    
    command.define("Command name", {
        exec: function(editor, session) {
           // Code to execute when command is triggered
           // editor and session provide the context in which the command is
           // executed
        },
        readOnly: true, // whether the command is available in read only documents
    });

Commands can either be triggered via the `Command:Enter Command` command (by default bound to `Command-.`/`Ctrl-.`) or via its tree view (by default bound to `Command-Shift-.`/`Ctrl-Shift-.`) or via a key binding. Keys are bound to command via Zed's configuration system (configuration.md).