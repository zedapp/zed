Zed Features
============

1. **Edit files remotely with your local preferences:** Need to edit files on a
   remote server, or even in a local VM, and don't like copying your editor's
   config files everywhere you go? Zed makes this easy: howto/remote.md
2. **Edit files locally:** Pick "Local Folder" from the project picker to
   edit local files.
3. **Chrome Application:** Installing via the Chrome Web Store brings a few
   useful features:
     1. Cross platform: Zed runs on any platforms that desktop Chrome runs on
        (including Chromebooks)
     2. Installation is easy with just a few clicks
     3. Upgrades are automatic
     4. Configuration are automatically synchronized between all computers
        logged into with the same Google account.
     5. Special "Notes" space is stored in Google Drive and synchronized between
        computers automatically as well. (Beta feature)
4. **State preservation**: Zed preserves your editor state completely: the state
   of your splits, recency of open files, cursor and scroll positions, even part
   of the undo history for open files.
5. **Auto save**: Zed always automatically saves your files. Save buttons
   are so '00s.
5. **Chromeless:** Zed fits Chrome perfectly, by not having any. The UI is
   completely clutter free.
6. **Keyboard oriented:** Zed can operated entirely with the keyboard.
7. **Programming language support:**
     * Linters/checkers for various languages (reports errors in the gutter as you edit
       code)
     * Code completion (`Tab`):
         * Words that appear in the current file (any file type)
         * Based on symbols (Zed has its own indexers for various languages)
         * Snippets
8. **Efficient project navigation** at various levels of granularity (howto/navigation.md):
     * Files, quickly jump to the file you want (`Command-E`)
     * Symbols, Zed indexes all symbols defined in your project and lets you
       quickly jump to the one you're interested in (`Command-R`, `Command-J`)
9. **Command-based:** Similar Emacs, every key you press in Zed runs a command.
   Keybinding to command mappings are configurable in the "Configuration" projects.
   Commands can also executed by name via `Command-.` (for a filter list view
   of all comands) or `Command-Shift-.` (for a tree view of all commands).
10. **(Vertical) split views**: either 1, 2 or 3 vertical splits. (`Command-1`,
   `Command-2`, `Command-3`,  and `Command-0` to switch between splits). Or use
   `Command-P` to get a preview split for various langauges: split.md
