Changelog
=========

0.11.3
------
* ZeDB: a simple abstraction layer on top of IndexedDB. Packages and other sandbox code can create their own data stores and indexes (via the `databases` key in configuration) and read, write and query that data quickly. This system is current primarily used for symbol indexing and code completion (see below).
* Complete rework of generic project indexing system, now storing symbol information in IndexedDB for faster retrieval (than the `/tags` file in ctags format that it used to use).
* Support for full function signatures and icons in symbol list (`Command-R`/`Ctrl-R`) and code completion for certain languages (JavaScript, Go, others still have to be updated)
* General-purpose regex-based symbol indexer allows to add basic symbol indexing to modes without writing any JavaScript (see Go and JavaScript mode for examples).
* Additional multi-cursor commands (`Cursor:Multiple:Add Above Skip Current` and `Cursor:Multiple:Add Below Skip Current` by thebishopgame)
* Standalone:
    * No longer crashes when an exception occurs
    * Do not save window position for minimized windows (by nightwing)
* Modes:
    * New matlab mode (by timothyrenner)
    * Markdown: disable strip whitespace (by robru)
    * Handlebars mode (by chenxsan)

0.11.2
------
* New "Edit in Zed" Chrome Extension for Zed Chrome version: adds a little on-hover Zed icon to textareas on any website in Chrome, when you click it, you can edit the contents of this text area using Zed. [Download the extension from the Chrome Store](https://chrome.google.com/webstore/detail/edit-in-zed/dpkaficlkfnjemlheobmkabnnoafeepg)
* Usage data colleciton: upon first launch you will be asked to agree to collect anonymous usage data. This helps us to see what features (e.g. language modes) people are using and what to improve.
* ZPM fix github package support (by conradz)
* Fix: code beautification (formatting) for selection works now
* Scroll past end of editor preference (by TheKiteEatingTree)
* Modes:
    * JSX (react.js) mode now has JSHint support
    * Ruby mode now also works on Vagrantfile
* Various minor bug fixes (by robru and others)

0.11.1
------
* New auto save that always saves (which should be friendlier for people using build systems with file watchers):
    * When switching between splits
    * When switching between files
    * When the editor loses focus
    * And optionally: after a x number of milliseconds of inactivity (set to `saveTimeout` to 0 to disable this)
* Commands to move splits around: (`Split:Move To *`)
* New splits now receive focus automatically
* Version number now appears in project picker
* Fixes to file tree (by eltuerto)
* Sandbox messages now appear in zed::log for standalone version
* Configuration now uses JSON5 format (which supports comments etc.)
* Fix to trim remote URLs when pasting (by surma)
* ZPM auto update fixes
* Scroll past end preference (`scrollPastEnd`) (by TheKiteEatingTree)
* Modes:
    * PHP mode now includes a parser and reports parse errors
    * Livescript mode (by maninalift)
    * Groovy mode (by calebmpeterson)
    * JSX mode
    * Improved Markdown preview styling (by ghotsla)

0.11
----
* Standalone:
    * First release of Zed standalone! I'm sure there will still be bugs, please report them on github when you find them.
    * Open individual files or directories from the command line by calling "zed <dir>" or "zed <file>". On Mac, please install the CLI tools via the `Tools:Install Mac CLI` or the native Tools menu in the Mac app to use this.
* Multiple keybindings support. That's right, we now have Vim and Emacs keybindings. Use the `Configuration:Preferences:KeyBinding:*` commands to switch between them. (by nightwing)
* New commands:
    * `File:Copy` (by iElectric)
* Language modes:
    * Python now has CTags indexing (by ghotsla)
    * Ability to switch off certain CSSLint options (by conradz)
* Bugs fixed:
    * Fixed a bug where when the project history is empty, no new projects are added.

0.10.2
------
* Refactoring of Zed core codebase to use Architect plug-ins, making it easier to create the Zed standalone (without Chrome dependency) version.
* New commands:
    * `Help:Commands` (bound to F1 by default) gives you a context-sensitive list of all available Zed commands in your current mode, documentation (if available) and current keybinding (by robru)
    * `Tools:Document Statistics` gives some useful stats about your current document (word count, line count, character count etc.) (by robru)
* Sandbox updates:
    * Added sandbox commands to call goto and invoke arbitrary other commands (by robru)
    * Added a "click" handler for the sandbox.
* Language modes:
    * Separate SCSS mode (by wpapper)
    * Scala mode (by netzwerg)
    * Mode is now set for files without a file extension based on Unix shebang line, e.g. #!/bin/bash uses bash mode (by robru)
* Made configuration loading more robust, even if user.json contains JSON parse errors.
* Minor fixes of the whitespace trimmer (by robru)
* Indent on paste fixes (by TheKiteEatingTree)
* Some minor updates to the manual (particularly the config.md documentation)

0.10.1
------
* Important: all sandbox APIs (and packages) have now been refactored to use JavaScript-native promises
* Sandbox commands can now request inputs like "text", "cursor" which will inject values directly into the first argument argument to the command. (by robru)
* The JSON and JavaScript modes have been extracted into Zed packages and will be kept up-to-date automatically outside the Zed release cycle
* Zed theme CSS will now automatically be updated as you edit it (by TheKiteEatingTree)
* Automatically indent on paste (by TheKiteEatingTree)
* Case insensitive find (by TheKiteEatingTree)

0.10
----
* New skinnable window chrome! Slightly more compact and generally more awesome. The edit bar is gone and has been incorporated with the title bar now.
* New and improved whitespace stripper that lives in the sandbox (by robru)
* Added "internal" flag to commands to not show commands only useful for internal use
* Window commands (`Window:Close`, `Window:Minimize` etc.) (by robru)
* Various new sandbox APIs (by robru)
* New `/user.css` file in Configuration project to override any editor style you like (independent of theme), changes apply on save (by TheKiteEatingTree)
* Moved all preference toggling commands to sandbox (by robru)
* New globalAutoRevert preference to automatically reload changed files without asking (by robru)
* Initial implementation of continous code completion (not bug free yet and disabled by default under `continuousCompletion` preference).
* Various bug fixes


0.9.4
-----
This is a release with some major new features, but they're not well documented and a bit hidden, so we'll wait a bit to expose them more seriously. I'm very happy to see that an increasing number of people are starting to contribute, in this release: TheKiteEatingTree, robru and dsrw. Thanks all!

* ZPM! We now have a package manager built-in, more information, and more heavy use of this on this in future releases (by TheKiteEatingTree)
* Sandbox code can now use CommonJS syntax without the require.js boiler plate (see new version of included sandbox extensions)
* Minor theme tweaks
* New `zed::log` document that gives you access to internal Zed (and sandbox) log messages
* Language support:
    * Sass language support (by dsrw)
    * Perl language support
    * Python snippets (by robru)
    * JSHint fix where the wrong word was underlined when using tabs (by TheKiteEatingTree)
* Selected line sorter command (by robru)
* Ability to move Configuration project to local folder (via `Configuration:Store in Local Folder`)
* Trim Whitespace on empty lines toggle command (by robru)
* Key binding tweaks (by robru)

0.9.3
-----
* Added RHTML mode (thanks Scott Wadden!)
* Added the ability to add extra globals for JSHint (thanks Bartek Szopka!)
* `zed::log` document that gives some information of what Zed is doing behind the scenes (eventually this will also contain sandbox messages).

0.9.2
-----
* Bound `Find:All` to `Ctrl-Alt-F`

0.9.1
-----
* Improved intro text when first entering the Zed editor (previously the "Zed Cheatsheet"
* Bind opening the tree to `Ctrl-T` on Linux/Windows/ChromeOS
* Use font set in preferences for context bar end edit bar
* Find:All command to put cursors on all instances of the current selection

0.9.0
-----
* Theme overhaul: themes are now part of Zed itself (they were part of ACE before), created using configuration files in the Configuration project. Users can now create custom themes as well from within the Configuration project. A theme can, in theory, theme any element of the Zed UI (but for now, just theme the editor).
* Created a custom dark Zed theme, which is now the default.
* Moved the extension sandbox into a Chrome `<webview>` which lives in its own process and therefore no longer blocks the editor event loop.
* Trying to infer position information from JSHint messages, thereby underlining warnings and errors inline rather than just with a gutter marker.
* Configuration project now has a README
* New `gotoExclude` preference with a list of patterns (use `*` as a wildcard) for files to exclude from goto (and project-wide search).
* Fixed bug where Zed would always say "No preview available" even when it was available.

0.8.5
-----

* Adds support for "Tools:Fix", a generic infrastructure to run arbitrary commands that can "fix" code or text (e.g. fix a spelling mistake, offer thesaurus based word suggestions, rename a variable etc.). Fix is bound to `Command-Enter`/`Ctrl-Enter`
* Adds a fixer for the spell checker
* Faster editor load: no longer analyzes all open files on editor open, but does so on demand.
* Goto panel now supports PgUp and PgDown as well as holding Up/Down/Tab/Shift-Tab keys to keep scrolling.

0.8.4
-----
* Added better PHP support (builtins, ctag indexing)
* Implemented file locking to avoid the file watcher picking up a changed file while it is being written
* Replaced showdown with pagedown for Markdown previewing
* Renamed `events` to `handlers` in configuration files
* Tree pop-up and disappear fix (thanks TheKiteEatingTree!)
* Added `check` handler to allow multiple extensions to contribute to the inline error markers
* HTML/CSS beautifiers now take tabSize preference into account (thanks TheKiteEatingTree!)
* Added a super initial version of a spell checker (disabled by default for now, enable by switching the `spellCheck` preference to `true`), no correction suggestions yet, US English only.

0.8.2
-----
* Initial implementation of Chrome-extension-to-extend-Zed support. Allowing users to write Chrome extensions that extend Zed's functionality. This feature is still in development.
* Tweaking of manual (added "Projects" page)
* Tweaked default project names slightly, tweaked font on non-Mac OSes of project picker window

0.8.1
-----
Purely a Chrome Web Store SEO release (different application name and description).

0.8.0
-----
* This release drops "zed --local" support, please use Chrome 31's+ Local Folder support instead
* File creation behavior change: when accidentally creating a file, e.g. by navigating to `/whoops` and pressing enter, the file is now only created once you type something in it. If you navigate away immediately, the file will not be created.
* Tweaked hints when about to create a new file (now becomes an action result)
* Added support for deleting and renaming projects (delete by pressing `Delete` in the project list, rename via the Project:Rename command).
* Bumped default maximum number of recent folder preference to 10.
* Some initial documentation on the Zed internals in the manual.

0.7.2
-----
Improved project navigation. The project list can now be navigated using your keyboard: Use `Up` or `Shift-Tab` to go up and `Down` or `Tab` to go down in the list and `Enter` to open the selected project. Type in the filter box to filter the project list.

The project list can be brought up from any Zed editor window using the `Command-Shift-O`/`Ctrl-Shift-O` key quickly.

0.7.1
-----
Replaced goto filter box implementation with an ACE editor implementation which should be _substantially_ faster, especially in large projects.
