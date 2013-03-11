var projectWin;

function showProjects() {
    if(projectWin) {
        projectWin.focus();
        return;
    }
    chrome.app.window.create('projects.html', { //'editor.html#http://localhost:8080/server/php/?/', {
        frame: 'none',
        width: 400,
        height: 400
    }, function(win) {
        projectWin = win;
        win.onClosed.addListener(function() {
            projectWin = undefined;
        })
        win.focus();
        win.show();
    });
}

chrome.app.runtime.onLaunched.addListener(showProjects);

chrome.commands.onCommand.addListener(function(command) {
    showProjects();
});