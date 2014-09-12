var fs = require('fs');
var modelist = {};

// this is a very dirty implementation of require, but since we're only
// importing one module, it will do
global.define = function(name, injects, cb) {
    var module = {exports: modelist};
    cb(require, modelist, module);
    modelist = module.exports;
};
global.window = {
    require: function() {}
}
require('app/ace/ext-modelist.js');

var modesJson = require('app/config/default/modes.json');

var blacklist = ['c_cpp', 'css', 'golang', 'javascript', 'json', 'plain_text',
                 'c9search', 'jsx', 'php', 'snippets'];

for(var i = 0; i < modelist.modes.length; i++) {
    var mode = modelist.modes[i];
    if(blacklist.indexOf(mode.name) >= 0) {
        console.log(mode.name + ' blacklisted');
        continue;
    }
    var jsonName = 'app/config/default/mode/' + mode.name + '.json';
    if(fs.existsSync(jsonName)) {
        console.log(mode.name + ' already exists');
        continue;
    }

    var extensions = mode.extensions.split('|'),
        extensions_pretty = [],
        filenames_pretty = [];
    for(var ei = 0; ei < extensions.length; ei++) {
        var ext = extensions[ei];
        if(ext[0] === '^')
            filenames_pretty.push('                "' + ext.substr(1) + '"');
        else
            extensions_pretty.push('                "' + ext + '"');
    }

    fs.writeFileSync(
        jsonName,
        '{\n' +
        '    modes: {\n' +
        '        ' + mode.name + ': {\n' +
        '            name: "' + mode.caption + '",\n' +
        '            highlighter: "' + mode.mode + '",\n' +
        (filenames_pretty.length ?
            '            filenames: [\n' +
            filenames_pretty.join(',\n') + '\n' +
            (extensions_pretty.length ?
                '            ],\n'
                : '            ]\n')
            : '') +
        (extensions_pretty.length ?
            '            extensions: [\n' +
            extensions_pretty.join(',\n') + '\n' +
            '            ]\n'
            : '') +
        '        }\n' +
        '    }\n' +
        '}\n',
        {flags: 'wx'});

    modesJson.imports.push('./mode/' + mode.name + '.json');
}

modesJson.imports.sort();
fs.writeFileSync('app/config/default/modes.json',
                 JSON.stringify(modesJson, null, 4));
