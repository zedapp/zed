/*global $*/
$(function() {
    function Menu(cutLabel, copyLabel, pasteLabel) {
        var gui = require('nw.gui'),
            menu = new gui.Menu()

            ,
            cut = new gui.MenuItem({
                label: cutLabel || "Cut",
                click: function() {
                    document.execCommand("cut");
                    console.log('Menu:', 'cutted to clipboard');
                }
            })

            ,
            copy = new gui.MenuItem({
                label: copyLabel || "Copy",
                click: function() {
                    document.execCommand("copy");
                    console.log('Menu:', 'copied to clipboard');
                }
            })

            ,
            paste = new gui.MenuItem({
                label: pasteLabel || "Paste",
                click: function() {
                    document.execCommand("paste");
                    console.log('Menu:', 'pasted to textarea');
                }
            });

        menu.append(cut);
        menu.append(copy);
        menu.append(paste);

        return menu;
    }

    var menu = new Menu( /* pass cut, copy, paste labels if you need i18n*/ );
    $(document).on("contextmenu", function(e) {
        e.preventDefault();
        menu.popup(e.originalEvent.x, e.originalEvent.y);
    });
});
