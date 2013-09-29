Howto: Edit local files with Zed
================================

There are two ways to edit local files with Zed:

1. If you're running Chrome version 31 or higher, the Zed startup dialog
   will have a "Edit Local Folder" option in its menu. Click this menu item
   and select the folder to edit and off you go.
2. If you're running an older version of Chrome, you need to install Zed
   as a local server, see below for instructions.

Install the Zed Local server
----------------------------

### Install on Mac

Installing Zed local on a Mac is easy and can be accomplised with a single
command:

    curl -O http://get.zedapp.org/install-local-mac.sh && sh install-local-mac.sh

Follow the instructions and you should be good to go (see "Usage" below).

### Install on Linux

First download the `zed` binary:

    curl http://get.zedapp.org | sh

There is an example [Zed local upstart script](https://github.com/zedapp/zed/blob/master/startup/zed.conf)
available on the Zed github repo for Linux distributions using Upstart (such as
Ubuntu). To use, copy `zed.conf` to `/etc/init/zed.conf` and change the `setuid`
and `setuid` lines to your Linux username, also change the `exec` path to
wherever you downloaded the `zed` binary.

Then, startup Zed local with `sudo initctl start zed`.

### Install on other Unices (also: alternative way of running on Linux)

First download the `zed` binary:

    curl http://get.zedapp.org | sh

Then, just run it in the background:

    nohup ./zed --local &

Note that you will have to do this everytime you boot your machine.

### Install on Windows

Download [zed.exe](http://get.zedapp.org/zed.exe) somewhere. Open up a command line window and run it with the `--local` flag:

    zed.exe --local /

Keep the command line window open as long as you're using Zed.

### Usage (any OS)

Once you successfully installed the Zed local daemon, you can now start editing
local files. To edit files in a directory, `cd` to that directory and run the `zed`
command without arguments, this will automatically pop up a Zed Chrome App window,
or instruct you to start the Chrome App before the window pops up.