Settings
========

Caelum implements settings via an in-editor settings file system, which stores its
files using Chrome's sync storage so that it will automatically be synced
between all your devices. There are file watchers on the settings files, which
reload settings whenever changes are made to the file. You can change the
`theme` setting to something else and within a few seconds you see the
colors of all your editor windows (on all your devices) change. The built-in
settings file all end with `.default.json` and cannot be changed. Files
with the same name replacing `default` with `user` can be used to override
settings. Some settings will also be available as an editor command and will
automatically add or update the entry in the user's settings file.

To edit settings, open the built-in `Settings` project.
