
/*global chrome*/
var projectWin = null;

function showProjects() {
    if (projectWin) {
        projectWin.show();
        return;
    }
    chrome.app.window.create('open.html', {
        frame: 'none',
        width: 400,
        height: 80
    }, function(win) {
        projectWin = win;
        win.focus();
        win.show();
    });
}

chrome.app.runtime.onLaunched.addListener(showProjects);