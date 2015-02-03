Zedd: the Zed daemon
====================

Zed's support for editing remote files has gone over many iterations. The latest is zedrem, which works, but is mostly helpful for only occassional editing. If you want to edit files on a server a lot, it becomes tempting to keep zedrem running in the background. But this is unsafe. Another thing is that zedrem uses an intermediate proxy server to work around any VPN and firewall issues. That's great, but if the central zedrem proxy server doesn't work reliably stuff breaks.

Zedd is yet another attempt at solving the remote editing problem. In many ways it's simpler than zedrem. It's a small node program (you can install it using npm) that you can run on a server and it will expose your home directory (by default) via HTTP (soon: HTTPS too), to be edited using Zed. Using flags you can add authentication to it which makes it a bit safer to keep running as a daemon in the background.

On the Zed side, you enter the URL to your server (Under "Zedd Folder"), pick a folder and start editing. Zedd projects are treated like local projects in that they're added to the project history.

Zedd, of course, can also be used to edit local files without having to deal with Chrome's sandboxing file system APIs.

Running CLI commands
--------------------

A returning issue is: how can I run command line tools from Zed? E.g. linters, build tools etc. The answer has always been: you can't. With Zedd I want to offer this capability for all zedd projects only. I'll extend the WebFS protocol (which is shared between zedrem and zedd) to support running commands (remotely) and getting their output.
