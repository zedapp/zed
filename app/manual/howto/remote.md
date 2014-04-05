Editing Remote Files with Zed
=============================

Zed has excellent support for editing files living on a remote server somewhere.
This even works for servers behind firewalls or living on a VPN, as long as
the server can make outbound connections to the Internet.

To use this feature, you need to install `zedrem` on the server where
files are to be edited. On most Unixes (e.g. Linux, Mac OS X and FreeBSD)
installing the `zedrem` program is as easy as:

    curl http://get.zedapp.org | bash

For Windows download the [Zed client](http://get.zedapp.org/zed.exe).

Then, from the command line run zedrem as follows:

    ./zedrem <directory-to-edit>

This will give you a URL you need to copy and paste into your Zed startup dialog. After pasting the URL, press Enter and a new Zed editor window will open. To stop editing, close the window and kill the Zed binary on the server with Ctrl-C.
