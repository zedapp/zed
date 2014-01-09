Changelog
=========

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