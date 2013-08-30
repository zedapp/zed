/*global define $*/
define(function(require, exports, module) {
    var command = require("./command");
    
    var sandboxEl;
    var id;
    var waitingForReply;
    
    function resetSandbox() {
        if(sandboxEl) {
            sandboxEl.remove();
        }
        $("body").append('<iframe src="sandbox.html" id="sandbox" style="display: none;">');
        sandboxEl = $("#sandbox");
        waitingForReply = {};
        id = 0;
    }
    
    exports.hook = function() {
        resetSandbox();
    };
    
    window.addEventListener('message', function(event) {
        var data = event.data;
        var replyTo = data.replyTo;
        if(!replyTo) {
            return;
        }
        var err = data.err;
        var result = data.result;
        
        if(waitingForReply[replyTo]) {
            waitingForReply[replyTo](err, result);
            delete waitingForReply[replyTo];
        } else {
            console.error("Got response to unknown message id:", replyTo);
        }
    });
    

    exports.exec = function(url, options, content, callback) {
        id++;
        waitingForReply[id] = callback;
        sandboxEl[0].contentWindow.postMessage({
            url: url,
            options: options,
            content: content,
            id: id
        }, '*');
    };
    
    command.define("Sandbox:Reset", {
        exec: resetSandbox,
        readOnly: true
    });
});