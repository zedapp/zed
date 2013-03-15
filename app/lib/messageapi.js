define(function(require, exports, module) {
    function handleApiRequest(api, message, postMessage) {
        console.log("Handle req", message);
        if(!message.id)
            return;
        var messageId = message.id;
        var name = message.name;
        var args = message.args;
        
        args.push(function(err, result) {
            postMessage({
                responseTo: messageId,
                err: err,
                result: result
            });
        });
        
        api[name].apply(null, args);
    }
    
    
    var waitingForReply = {};
    var messageId = 0;
    function call(postMessage, name, args, callback) {
        messageId++;
        postMessage({
            id: messageId,
            name: name,
            args: args
        });
        waitingForReply[messageId] = callback;
    }
    
    function handleResponse(message) {
        console.log("Handle resp", message);
        if(!message.responseTo)
            return;
        var responseTo = message.responseTo;
        var err = message.err;
        var result = message.result;
        
        waitingForReply[responseTo](err, result);
        delete waitingForReply[responseTo];
    }
    
    function setupServer(win, api) {
        window.addEventListener("message", function(event) {
            console.log("Got message", message);
            handleApiRequest(api, JSON.parse(event.data), function(message) {
                event.source.postMessage(JSON.stringify(message), "*");
            });
        });
    }
    
    function setupClient() {
        window.addEventListener("message", function(event) {
            handleResponse(JSON.parse(event.data));
        });
    }
    
    function invoke(name, args) {
        console.log("Invoke", name, args);
        args = Array.prototype.slice.call(arguments, 1);
        call(function(message) {
            postMessage(JSON.stringify(message), "*");
        }, name, args.slice(0, args.length-1), args[args.length-1]);
    }
    
    module.exports = {
        setupServer: setupServer,
        setupClient: setupClient,
        invoke: invoke,
        waitingForReply: waitingForReply
    }
});