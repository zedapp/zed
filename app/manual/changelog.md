Changelog
=========

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