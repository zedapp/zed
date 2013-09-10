
/*global chrome*/
function showProjects() {
    chrome.app.window.create('open.html', {
        frame: 'chrome',
        width: 400,
        height: 180
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

var MAX_RECENT_PROJECTS = 5;

function addToRecentProjects(url) {
    chrome.storage.local.get("recentProjects", function(results) {
        var projects = results.recentProjects || [];
        if(projects.indexOf(url) !== -1) {
            projects.splice(projects.indexOf(url), 1);
            projects.splice(0, 0, url);
        } else {
            projects.splice(0, 0, url);
            if(projects.length > MAX_RECENT_PROJECTS) {
                projects.splice(projects.length - 1, 1);
            }
        }
        chrome.storage.local.set({recentProjects: projects});
    });
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
        addToRecentProjects(event.data);
    };
}

listenOnLocalSocket();