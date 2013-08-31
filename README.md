Caelum
======

Welcome to Caelum, a code editor built using web technologies, designed to rethink
some of the assumptions that underly most editors today. Some of the editor's
core features are the features it does **not** have:

* Tabs
* Always visible file tree
* Menus and buttons and bells and whistles

What you get instead is a bare bones, simple yet powerful editor that focusses
on what matters most: making you as productive at editing code and text as
possible. To enable this, Caelum has:

* Multiple cursors. Once mastered, you will never edit code the same way again.
* Code completion based on symbols defined in your project, current file and
  snippets.
* Efficient project navigation at various levels of granularity:
    * Files, quickly jump to the file you want
    * Symbols, Caelum indexes all symbols defined in your project and lets you
      quickly jump to the one you're interested in
* (Vertical) split views, either 1, 2 or 3 vertical splits.
* Auto-updating preview split for various languages (including markdown and
  coffeescript).

Caelum runs inside of Chrome and as such does not have free access to your local
file system. Therefore, it communicates via a simple protocol named
[WebFS](https://github.com/zefhemel/caelum/blob/master/app/manual/webfs.md). 

Screenshots
-----------

![Project picker](http://zef.me/wp-content/uploads/2013/03/Screen-Shot-2013-03-26-at-12.24.09.png)
![Goto](http://zef.me/wp-content/uploads/2013/03/goto.png)
![Screenshot](http://zef.me/wp-content/uploads/2013/03/Screen-Shot-2013-03-26-at-11.02.55.png)
![Screenshot](http://zef.me/wp-content/uploads/2013/03/complete.png)

Installation
------------
Caelum runs as a Chrome Package App. To install:

    $ git clone https://github.com/zefhemel/caelum.git
    $ cd caelum
    $ ./install-deps.sh

Then, in (a recent version of) Chrome, go to the "three-lined" menu > Tools >
Extensions and click the "Load unpacked extension..." button, navigate to the
`app` directory inside the Caelum repository checkout. Caelum should now run!

Running a Caelum server
----------------------

Requirements: go 1.1 or newer.

After cloning the repo and installing the deps:

    $ go build
    
This will produce a `caelum` binary. The `caelum` binary has three modes:

1. Server mode: server mode acts as a proxy between the Caelum Chrome application
   and the server where the files to be edited are located.
2. Client mode (default): connects to a Caelum server, and exposes a file system
   for editing
3. Local mode: combines the client and server into a single process

Run `./caelum --help` for help.

Inspiration
-----------

Inspiration for Caelum comes from:

* [Notational Velocity](http://notational.net): the goto bar combining search
  with new file creation
* Apple's iOS and recent Mac file management: abstraction from whether a file
  is open and by removing the idea that a file has to be explicitly saved.

Technology
----------

* The excellent [ACE](http://github.com/ajaxorg/ace) editor
* [jQuery](http://jquery.com)
* [Require.js](http://requirejs.org)
