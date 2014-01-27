Zed Implementation Architecture
===============================
Zed consists of two parts:

1. The Zed Chrome application
2. The Zed client/server binary (for editing remote files)

Chrome App
----------

The Chrome applications consists of three different screen (window) types:

1. The project list (implementation in `/app/open.html` and `/app/js/open.js`
2. Editor windows: dev/editor.md
3. Dropbox open folder window (implementation in `/app/dropbox/open.html` and `/app/dropbox/open.js`)

The client/server binary for editing remote files
-------------------------------------------------

This is implemented in [Go](http://golang.org) in the `*.go` files in the project root. Main entry point is `zed.go`, which, based on flags will run either in server mode (`server.go`) or client mode (`client.go`).

The server acts as a proxy between the client and the chrome application. When you run Zed in client mode it will establish a websocket connection with a Zed server. The Zed server will assign the connection a unique id, and expose the file system via the WebFS protocol (dev/webfs.md) to the Chrome application. All WebFS calls to the server will be proxied to the client in question, and responses are routed back to the Chrome app. This way files can be edited even on servers in VPNs and behind firewalls, as long as both the Chrome app and client have access to a Zed server.