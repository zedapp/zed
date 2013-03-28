Zed
===

Welcome to Zed, a code editor built using web technologies, designed to rethink
some of the assumptions that underly most editors today. Some of the editor's
core features are the features it doesn't have:

* Tabs
* Always visible file tree
* Menus and buttons and bells and whistles

What you get instead is a bare bones, simple yet powerful editor that focusses
on what matters most: making you as productive at editing code and text as
possible. To enable this, Zed has:

* Multiple cursors. Once mastered, you will never edit code the same way again.
* Code completion based on symbols defined in your project, current file and
  snippets.
* Efficient project navigation at various levels of granularity:
    * Files, quickly jump to the file you want
    * Symbols, Zed indexes all symbols defined in your project and lets you
      quickly jump to the one you're interested in
* (Vertical) split views, either 1, 2 or 3 vertical splits.
* Auto-updating preview split for various languages (including markdown and
  coffeescript).

![Screenshot](http://zef.me/wp-content/uploads/2013/03/complete.png)

Zed runs inside of Chrome and as such does not have free access to your local
file system. Instead, it communicates via a simple protocol named
[WebFS](https://github.com/zefhemel/zed/blob/master/app/manual/webfs.md). In the
Zed repo, there's two implementations of WebFS, one in PHP, and another in
Python. They both reside in the `server` directories. For accessing a local
filesystem, the Python version is recommended.

Installation
------------
Zed runs as a Chrome Package App. To install:

    $ git clone https://github.com/zefhemel/zed.git
    $ cd zed
    $ ./install-deps.sh

Then, in (a recent version of) Chrome, go to the "three-lined" menu > Tools >
Extensions and click the "Load unpacked extension..." button, navigate to the
`app` directory inside the Zed repository checkout. Zed should now run!

Running a WebFS server
----------------------

After cloning the repo, `cd` into the `server` directory and run the Python
version:

    $ python webfs.py

The server will now run on port `1338` and is accessible via
`http://localhost:1338`, if you go to this URL, you should see a directory
listing of your home directory.

You can also run the PHP version, the `test.php` and `testauth.php` scripts show
how to set it up. Once installed, the WebFS is accessible via
`http://yourserver.com/somedir/test.php/` as root. The PHP version also supports
authentication, the Python version does not yet.

Creating a Zed project
----------------------

Now that the WebFS server is running, you can create a Zed project to access it.
Launch the Zed project picker by pressing the Chrome-wide hotkey:
`Command-Shift-Z`/`Ctrl-Shift-Z`. This should show a picker with two default
projects: `Settings` and `Manual`. To create a new project, just start typing
its name, then press `Return`. Three more input fields will now appear. If you
run the Python WebFS server and want to create a project around `~/git/zed`, you
enter the URL: `http://localhost:1338/git/zed`, no username and password are
required. Press `Enter` again to create the project. Then, open the project.
Welcome to Zed!

For more documentation, look at the Manual project, or at the [files on
github](https://github.com/zefhemel/zed/tree/master/app/manual).

Inspiration
-----------

Inspiration for Zed comes from:

* [Notational Velocity](http://notational.net): the goto bar combining search
  with new file creation
* Apple's iOS and recent Mac file management: abstraction from whether a file
  is open and by removing the idea that a file has to be explicitly saved.

Technology
----------

* The excellent [ACE](http://github.com/ajaxorg/ace) editor
* [jQuery](http://jquery.com)
* [Require.js](http://requirejs.org)