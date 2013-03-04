Zed
===
This is an editor that I built for myself being unhappy with every editor available
today.

Design principles
-----------------

* Light-weight, portable back-end: reimplement easily in any technology you desire.
* No notion of "open" files, you just pick a file and it may fetch it from disk
  or load it from memory.
* Transparent persistency (automatic saving)
* Reduce chrome: focus on the editing, have as little UI as possible
* Hackable editor: written using Javascript, one of the most popular language in
  the world -- leverage that power.

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