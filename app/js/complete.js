/*global define ace $ _ */
define(function(require, exports, module) {
    "use strict";
    
    var editor = require("./editor");
    var keys = require("./keys");
    var command = require("./command");
    var string = require("./lib/string");
    var keyCode = require("./lib/key_code");
    var async = require("./lib/async");
    var settings = require("./settings");
    var Autocomplete = ace.require("ace/autocomplete").Autocomplete;
    
    var snippetManager = ace.require("ace/snippets").snippetManager;

    var completers = [
        ace.require("ace/autocomplete/text_completer"),
        require("./complete/snippet"),
        require("./complete/ctags")
    ];
    
    exports.addCompleter = function(completer) {
        completers.push(completer);
    };
    
    var identifierRegex = /[a-zA-Z_0-9\$\-]/;

    function retrievePreceedingIdentifier(text, pos) {
        var identBuf = [];
        for (var i = pos - 1; i >= 0; i--) {
            if (identifierRegex.test(text[i])) {
                identBuf.push(text[i]);
            } else {
                break;
            }
        }
        
        return identBuf.reverse().join("");
    }
    
    function shouldComplete(edit) {
        var session = edit.getSession();
        var doc = session.getDocument();
        var pos = edit.getCursorPosition();

        var line = doc.getLine(pos.row);
        return retrievePreceedingIdentifier(line, pos.column);
    }

    command.define("Edit:Complete", {
        exec: function(edit) {
            if(shouldComplete(edit)) {
                if (!edit.completer) {
                    edit.completer = new Autocomplete();
                    edit.completers = completers;
                }
                edit.completer.showPopup(edit);
                // needed for firefox on mac
                edit.completer.cancelContextMenu();
            } else {
                edit.indent();
            }
            /*if (!complete()) {
                edit.indent();
            }*/
        }
    });
});