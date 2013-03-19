All about cursors
=================

Zed has very powerful multiple cursor support.

Block selection (mouse)
-----------------------
Hold down `Alt` and select a block of text, now any edit commands will be
applied to the block as a whole.

Adding cursors (keyboard)
-------------------------

* `Ctrl-Alt-Down`: add a cursor below the current one
* `Ctrl-Alt-Up`: add a cursor above the current one
* `Ctrl-Alt-Left`: add a cursor around the next instance of the current
  selection, or, if there's no selection, the next instance of the identifier
  under the cursor.
* `Ctrl-Alt-Right`: same as `Ctrl-Alt-Left`, but in the reverse direction.