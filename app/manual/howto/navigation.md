Navigation
==========

The goto box is your swiss army knife of project navigation. To access it, press `Command-E`/`Ctrl-E`. This will pop up an input box with a list of files in your project. Alternatively, `Command-T`/`Ctrl-T` shows a tree representation of the project, this is more useful in the exploration stages of working on a project.

The rest of this document focuses on the goto box.

Basics
------
In its most basic (and common) use, you select the file you'd like to navigate to by typing in part of its filename and once the file is selected, you press `return` to open it.

If no file is selected, _a new file will be created_. For instance when entering `/README.md` and this file does not yet exist, pressing `Enter` will create this file and open it. You don't have to worry about non-existing directories, if you open `/my/imaginary/path.txt`, the directories `/my` and `/my/imaginary` will automatically be created if they don't already exist.

Files are ordered by score, or if the score is the same, by date last opened, therefore recently opened files show up at the top. This makes switching between recent files a very quick `Command-E`/`Ctrl-E` followed by `Return`.

Filtering
---------
There some special syntax you can use to alter the mode and meaning of
your filter query.

* `/` starting your query with `/` only matches paths with your query as
  prefix. Using `/` within a query means that the part before the `/` should be   part of a directory name.
    * **Example**: `/mode` will match `/mode/bla.txt`,  but not  `/mymode.txt`. And `mo/javascript.js` will match `/mode/javascript.js`, but not `/test/javascript.js`.
* `:` starting your query with `:`, or using `:` within your query following a number, will jump to the line number that succeeds it.
    * **Example**: the query `:10` will jump to line 10 of your current file. The query `mod:10` will jump to line 10 of the first match of the `mod` query.
    * **Shortcut**: `Command-L`/`Ctrl-L`.
* `:/` starting your query with `:/`, or using `:/` within your query following a search string, will jump to the first match of this string with a file.
    * **Example**: the query `:/hank` will search for "hank" in your current document.
    * **Shortcut**: `Command-F`/`Ctrl-F`.
* `:@` starting your query with `:@`, following a search string, will jump to the first definition of a _symbol_ matching that search string in the current file.
    * **Example**:, the query `:@toString` will jump to the defintion of the `toString` function or method. A shortcut to this functionality is `Command-R`/`Ctrl-R`.
    * **Shortcut**: `Command-R`/`Ctrl-R`.
* `@` starting your query with `@` following by a search string will match symbols defined in the whole project.  
    * **Example**: the query `@toString` will show all definitions of `toString` functions and methods in the current project.
    * **Shortcut**: `Command-J`/`Ctrl-J`.
* `space` pressing the spacebar in an empty query box inserts the path of the current open session.
    * **Example**: When the file `/js/modes/javascript.js` is open, pressing the spacebar inserts `/js/modes/`.

#protip
-------

Many keyboard shortcuts have a version with an additional `Shift` modifier to apply to the path/word under the cursor. For instance, pressing `Command-Shift-E`/`Ctrl-Shift-E` automatically inserts the path under the cursor as query and `Command-Shift-J`/`Ctrl-Shift-J` automatically uses the identifier under the cursor to search for symbols in the project.
