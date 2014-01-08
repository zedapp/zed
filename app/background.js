/*global chrome*/
function showProjects() {
    chrome.app.window.create('open.html', {
        frame: 'chrome',
        width: 400,
        height: 180
    }, function(win) {
        win.focus();
    });
}

chrome.app.runtime.onLaunched.addListener(showProjects);