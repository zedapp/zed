define(function(require, exports, module) {
    var eventbus = require("eventbus");
    var editor = require("editor");
    var keys = require("keys");
    var sandboxEval = require("commandline").sandboxEval;
    var state = null; // delayed: require("state");
    
    var commandHistory = [];
    
    exports.hook = function() {
        require(["state"], function(state_) {
            state = state_;
        });
        eventbus.on("splitchange", update);
        eventbus.on("switchsession", switchSession);
        keys.bind("entercommand", {
                mac: "Command-.",
                win: "Ctrl-."
            }, enterCommand);
        
        eventbus.once("editorloaded", function() {
            editor.getEditors(true).forEach(function(edit, idx) {
                $(edit.container).css("bottom", "25px");
                $("body").append("<div id='editbar" + idx + "' class='editbar'><div class='path'></div><div class='info'>test</div>");
                edit.editbarEl = $("#editbar" + idx);
                
                var info = edit.editbarEl.find(".info");
                edit.on("changeSelection", function() {
                    var range = edit.getSelection().getRange().start;
                    info.text("[" + (range.row+1) + "," + (range.column+1) + "]");
                });
            });
        });
        
        eventbus.on("stateloaded", function(state) {
            commandHistory = state.get("commandhistory") || [];
        });
    };
    
    function update() {
        editor.getEditors(true).forEach(function(edit, idx) {
            var el = $(edit.container);
            var barEl = edit.editbarEl;
            if(el.is(':visible')) {
                barEl.removeClass("hidden");
                barEl.css("left", el.offset().left + "px");
                barEl.css("width", el.width() + "px");
            } else {
                barEl.addClass("hidden");
            }
        });
    }
    
    $(window).resize(update);
    
    function enterCommand() {
        var editbarEl = editor.getActiveEditor().editbarEl;
        editbarEl.find('div').hide();
        editbarEl.append('<input type="text" id="commandline" placeholder="command">');
        
        setupCommandLine($("#commandline"));
    }
    
    
    function addCommandToHistory(command) {
        var idx = commandHistory.indexOf(command);
        if(idx !== -1) 
            commandHistory.splice(idx, 1);
        if(commandHistory.length > 50)
            commandHistory = commandHistory.slice(commandHistory.length - 50);
        commandHistory.push(command);
        state.set("commandhistory", commandHistory);
    }
    
    function setupCommandLine(el) {
        function close() {
            el.parent().find("div").show();
            el.remove();
            editor.getActiveEditor().focus();
        }
        
        var historyIdx = commandHistory.length;
        
        el.keyup(function(event) {
            switch(event.keyCode) {
                case 27: // esc
                    close();
                    break;
                case 38: // up
                    historyIdx = Math.max(historyIdx - 1, 0);
                    el.val(commandHistory[historyIdx]);
                    break;
                case 40: // down
                    var command = el.val();
                    historyIdx = Math.min(historyIdx + 1, commandHistory.length-1);
                    el.val(commandHistory[historyIdx]);
                    break;
                case 13: // enter
                    var command = el.val();
                    sandboxEval(command);
                    addCommandToHistory(command);
                    close();
                    break;
            }
        });
        el.focus();
    }
    
    function switchSession(edit, session) {
        edit.editbarEl.find('.path').text(session.filename.substring(1));
    }
});
