
/*global chrome*/
function showProjects() {
    chrome.app.window.create('open.html', {
        frame: 'chrome',
        width: 400,
        height: 80
    }, function(win) {
        win.focus();
        //win.show();
    });
}

chrome.app.runtime.onLaunched.addListener(showProjects);

var timeOut;

function tryAgainLater() {
    if(timeOut) {
        clearTimeout(timeOut);
    }
    timeOut = setTimeout(function() {
        listenOnLocalSocket();
    }, 10000);
}

function listenOnLocalSocket() {
    var ws = new WebSocket("ws://localhost:7336/signalsocket");
    ws.onerror = tryAgainLater;
    ws.onclose = tryAgainLater;
    ws.onmessage = function(event) {
        chrome.app.window.create('editor.html?url=' + event.data + '&chromeapp=true', {
            frame: 'chrome',
            width: 720,
            height: 400,
        }, function(win) {
            win.drawAttention();
        });
    };
}

listenOnLocalSocket();