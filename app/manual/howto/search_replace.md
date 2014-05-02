How to: Search & Replace
=======================

Find in file
-------------
Find in file: `Command-F`/`Ctrl-F`, then to jump to the next match (with the match still selected): `Command-G`/`Ctrl-K` to jump to other instances of the identifier under the cursor use `Command-[`/`Ctrl-[` (previous instance) and `Command-]`/`Ctrl-]` (next instance).

Find and replace
----------------
Zed has no specific find & replace functionality, instead this is realized using multiple cursors:

First search (`Command-F`/`Ctrl-F`) for the phrase to replace, then you add cursors to however many instances of that phrase as you want via `Ctrl-Alt-Right`, after you start typing, the change will be applied at all locations. Pressing `Ctrl-Alt-Right` many times is not ideal, so to put cursors on all instances in the file at once use `Command-Shift-G`/`Ctrl-Alt-F`.

Find in project
---------------
Press `Command-Shift-F`/`Ctrl-Shift-F` to search inside of a project. Replace in project is not yet supported.
