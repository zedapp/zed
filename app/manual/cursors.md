All about cursors
=================

Zed has very powerful multiple cursor support inherited from ACE.

Block selection (mouse)
-----------------------
Hold down `Alt` and select a block of text, now any edit commands will be
applied to the block as a whole.

Adding cursors (keyboard)
-------------------------

* `Ctrl-Alt-Down`: add a cursor below the current one
* `Ctrl-Alt-Up`: add a cursor above the current one
* `Ctrl-Alt-Left`: add a cursor around the previous instance of the current
  selection, or, if there's no selection, the next instance of the identifier
  under the cursor.
* `Ctrl-Alt-Right`: same as `Ctrl-Alt-Left`, but in the reverse direction.

#protip
-------

Zed does not have a find and replace feature. It doesn't need it, the Zed way
of doing it is searching for an instance of the string (or selecting it), then
adding cursors on other instances using `Ctrl-Alt-Right` and `Ctrl-Alt-Left`,
and then simply typing the replacement.
