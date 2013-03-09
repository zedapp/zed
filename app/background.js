chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
    frame: 'chrome', width: 720, height: 400, minWidth:720, minHeight: 400
  });
});