chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('projects.html', {//'editor.html#http://localhost:8080/server/php/?/', {
    frame: 'chrome', width: 720, height: 400, minWidth:720, minHeight: 400
  });
});