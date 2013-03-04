Basic usage
===========

Keys
-----

* `Command-E`: To open or create a new file. Inside the picker:
    * In an empty box, press space to complete the directory of the currently open document.
    * Press slash (/) to complete the directory to the first match
    * Press Up/Down or Tab/Shift-Tab to walk over results
    * Pressing enter does different things in different situations:
        * When an item is selected, it will jump to the selected file
        * If no item is selected, it will create a new file with this path
* `Command-.`: Run (Javascript) commands. Inside the box (appears in the editbox at the bottom):
    * if the expression returns a function, that function will be run on either
      the currently selected text (if any) as a string, or the whole file
      (if nothing is selected).
    * `s/text/replaceby/` replaces text (use `/g` modifier for global replace)
    * `/text` finds text and puts cursors on them all.
* `Command-Shift-B`: Beautify the selected piece of (HTML, CSS, Javascript) code.
* `Command-1`: 1 split
* `Command-2`: 2 vertical splits
* `Command-3`: 3 vertical splits
* `Command-0`: switch focus from one split to the next