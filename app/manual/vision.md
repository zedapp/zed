Vision
======

Zed stems from some observations after 20 years of editing code.

**Tabs**: Whether you use them in an editor or in a browser, if you're like me,
your open tabs quickly become unwieldy and pretty soon you are unable to find
the tab you're looking for. Why do we use tabs in editors anyway? I believe its
sole purpose is to be able to _quickly navigate_ to files you're working on.
However, this convenience results in the inconvenience of having to manage the
tabs themselves. Having up to ten tabs open is usually ok, but after that your
tabs get so narrow you can no longer read their titles and you have to start
deciding which ones to close. Usually what I do is give up on the whole thing
and close all of them, and reopen the ones I need as I need them kind of
defeating the whole purpose. Conclusion: tabs may not be a great idea for code
editing.

**File tree**: There's a few things I don't like about the often present file
tree. The first: it takes space. The second, usually you have to operate them
with your mouse, or at least, I always end up operating them with my mouse. I
don't like using my mouse, it's bad for my
[RSI](http://en.wikipedia.org/wiki/Repetitive_strain_injury). Second, navigation
is slow. If you have a big projects, with a big directory hierarchy, you end up
expanding a lot of tree nodes, and it's always the wrong nodes that have already
been expanded cluttering up your view. So now you end up doing tree management
as well as tab management. There's the use case of doing file management
(exploring, renaming, copying, moving files around) for the tree, but for navigation
between files -- for me by far the more common use case -- it's pretty bad.
Conclusion: tree (at least as primary file navigation mechanism) gotta go.

**File saving**: If you're an iOS (or I suppose Android) user, you may have
noticed there's no "Save" button to be found anywhere. Why? Well, why would you
need one? Why does saving a file have to be an explicit command? At Cloud9 we
discussed enabling auto saving by default, but decided against it because it was
deemed too controversial (you can switch it on in your preferences, though).
Personally, I don't want to deal with having to press Cmd-S all the time. Some
people say that they wouldn't want to auto save, because quite often they making
drastic changes to a file that they can then easily revert by closing the file
and reopening it, but that seems more like the job of either a version control
system, or simply good undo functionality. Conclusion: explicit file saving
gotta go.

**Split view**: I have a 15" Macbook. If I maximize my editor, I have a lot of
white space on the right side. My code doesn't run much longer than
approximately 80 characters. I also have a 27" external screen. Maximizing my
editor there looks insane without split views. Split views are a must have, but
when used too heavily can have similar problems as tabs. For instance, in Vim I
sometimes go pretty crazy in the number of splits (perhaps 6 or 9 frames). Now
you make good use of space, but how do you navigate this mess, which one is
active, which file went where? In my experience, vertical splits are useful, but
you probably only need about two, or three at most (until I get my 60" screen).
Since the trend in computer screens appears to be for them to become wider
rather than higher, horizontal splits are probably less useful (and combining
the two always confuses me). Conclusion: split views are must haves, but maybe
protect me against myself in using them.

**Extensibility**: At various times I have found the idea of Emacs very
appealing and invested time in learning it. Emacs is the ultimate programmable
editor. Using Emacs' amazing Elisp language, you can change about everything
about what Emacs does. You can rebind keys, add completely new features. The
power in amazing. But yeah, Elisp... Vim in many ways is similar, it also very
extensible, using Vimscript, not exactly as extensible as Emacs, but close. But
yeah, it's this interesting Vimscript language. If you go for Emacs you have to
learn Elisp, if you go for Vim you have to learn Vimscript. These days, many
developers don't write Lisp or Vimscript for a living, it would be nicer if the
language to extend their editor is something closer to what they know.
Javascript for instance. Conclusion: extensibility is a must, but use a sane
language.

**Open source**: I'm by no means a free software fundamentalist. I don't believe
software has to be free by any means. However, I do believe in the practicality
of open source software. If you want to make building an editor your full-time
job, like the guy who builds [Sublime Text](http://www.sublimetext.com/), that's
great, go ahead and sell your software. If you're not interested in that, or
want to attract an audience that wants to hack at the editor itself (the core of
the thing, not just plugins), then open source is a good model. I believe that
open sourcing stuff is a good thing and I like the _idea_ of being able to go
in, fix a bug and submit a pull request to the author. Conclusion: open source
is good.

**Chrome**: Many editors today boast a "distraction free" mode. "Remove all the
distracting chrome!" That's great, but when _do_ I want all this distracting
chrome? Never. It should always be me and my code, with as little chrome as
possible. No panels, no tab bars. Just as clean as functionally possible. If
there's anything visible to me other than the code I'm editing, there'd better
be a damn good reason, that is either it gives me a sense of context (what file
am I editing? Where am I within this file?) or it's a temporary UI element that
I explicitly asked for (e.g. an open file dialog). Conclusion: reduce chrome to
the min.

**Editor state**: Another thing I observed using iOS applications: preserving UI
state between application launches is very convenient. No longer do you need
recreate your entire setup (open tabs, split views) between application
restarts. All of that should just be persistent. We did this pretty well in
Cloud9, that's the way to go. Conclusion: near perfection UI state preservation
is a must.

**Remote file editing**: Although all the points above this one are nice, I made
them up as I worked on this project. The trigger to hack on my own editor is
that I spend a lot of my time these days editing files in a virtual machine,
i.e. not locally. The current version of LogicBlox runs only on 64-bit Linux,
and I'm a Mac user. So, I have a VMWare Fusion VM with Linux running, with all
my stuff there. I've wasted many hours in setting up shared folders with my Mac,
using SSHFS and Fuse to share a file system, but each had its own set of
problem. Eventually I broke down and switched to doing a lot of my editing
inside the VM, which is _highly_ confusing, because of course Linux keybindings
are different than on the Mac. Not great. What I need is first-class support for
editing files "remotely". I realize this is not important to everybody, but hey,
deal with it, this editor's primary audience (for now) is me. Conclusion: gotta
have remote file editing support.

