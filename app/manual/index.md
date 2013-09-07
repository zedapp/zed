Welcome to Zed
==============

Welcome to Zed, a code editor designed to rethink some of the assumptions that
underly most editors today. Some of the editor's core features are the features
it doesn't have:

* Tabs
* Always visible file tree
* Menus and buttons and bells and whistles

What get instead is a bare bones, simple editor that focusses on what matters
most: making you as productive at editing code and text as possible.

Features
--------

Enough about what Zed _doesn't_ have, let's see what it does feature. All keyboard
shortcuts mentioned here refer to the default keybindings. For Windows and Linux
replace `Command` with `Ctrl`.

* Chrome Application: the application is deployed via the Chrome Web Store, which
  brings a few useful features:
    1. Cross platform: Zed runs on any platforms that desktop Chrome runs on
       (including Chromebooks)
    2. Installation is easy with just a few clicks
    3. Upgrades are automatic
    4. Settings are automatically synchronized between all computers logged into
       with the same Google account.
    5. Special "Notes" space is stored in Google Drive and synchronized between
       computers automatically as well.
* Keyboard oriented: The editor has been designed to be used without a mouse.
* Multiple cursors. Once mastered, you will never edit code the same way again.
* Programming language support:
    * Checkers for various languages (reports errors in the gutter as you edit code)
    * Code completion (`Tab`):
        * Words that appear in the current file (any file type)
        * CTags (ctags.md)
        * Snippets (snippets.md)
* Efficient project navigation at various levels of granularity:
    * Files, quickly jump to the file you want (`Command-E`)
    * Symbols, Zed indexes all symbols defined in your project and lets you
      quickly jump to the one you're interested in (`Command-R`, `Command-J`)
* (Vertical) split views, either 1, 2 or 3 vertical splits. (`Command-1`,
  `Command-2`, `Command-3`,  and `Command-0` to switch between splits).
* Auto-updating preview split for various languages (`Command-P`)

Topics
------

To quickly navigate to the topic, put your cursor on the file name and press
`Command-Shift-E` (or `Ctrl-Shift-E` on non-Mac OSes).

* Essential keyboard shortcuts: cheatsheet.md
* Split-view editing: split.md
* CTags: ctags.md
* Snippets: snippets.md
* Project navigation: navigation.md
* Managing settings: settings.md
* Multiple cursors: cursors.md
* Language modes: languages.md
