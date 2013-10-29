Sandbox APIs
============

These are APIs that can be called from Zed custom commands. They are available
as require.js modules as follows:

    var session = require("zed/session");
    
    session.getText("/somefile", function(err, text) {
        // do something with the text
    });

The implementations in this directory conist of two parts:

* Proxies defined in interface/, which shuttle the request from the sandbox to 
  the Zed application via `sandboxRequest`, which uses HTML5's postMessage to
  communicate with its parent.
* Implementations defined in impl/, which contain the actual implementation
  of the APIs running inside the Zed application.