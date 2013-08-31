
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