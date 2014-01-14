// Adapted from: http://remysharp.com/2008/07/08/how-to-detect-if-a-font-is-installed-only-using-javascript/
/* global $, _ */
define(function(require, exports, module) {
    var test_string = 'mmmmmmmmmwwwwwww';
    var test_font = '"Comic Sans MS"';
    var notInstalledWidth = 0;
    var testbed = null;
    var guid = 0;

    $(document).ready(function() {
        if ($('#fontInstalledTest').length) return;

        $('head').append('<' + 'style> #fontInstalledTest, #fontTestBed { position: absolute; left: -9999px; top: 0; visibility: hidden; } #fontInstalledTest { font-size: 50px!important; font-family: ' + test_font + ';}</' + 'style>');


        $('body').append('<div id="fontTestBed"></div>').append('<span id="fontInstalledTest" class="fonttest">' + test_string + '</span>');
        testbed = $('#fontTestBed');
        notInstalledWidth = $('#fontInstalledTest').width();
    });

    return {
        isInstalled: _.memoize(function(font) {
            guid++;

            var style = '<' + 'style id="fonttestStyle"> #fonttest' + guid + ' { font-size: 50px!important; font-family: ' + font + ', ' + test_font + '; } <' + '/style>';

            $('head').find('#fonttestStyle').remove().end().append(style);
            testbed.empty().append('<span id="fonttest' + guid + '" class="fonttest">' + test_string + '</span>');

            return (testbed.find('span').width() != notInstalledWidth);
        })
    };
});