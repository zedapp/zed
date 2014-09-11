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

var blacklist = ['c_cpp', 'css', 'javascript', 'json', 'plain_text'];

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
        extensions_pretty = [];
    for(var ei = 0; ei < extensions.length; ei++)
        extensions_pretty.push('                "' + extensions[ei] + '"');

    fs.writeFileSync(
        jsonName,
        '{\n' +
        '    modes: {\n' +
        '        ' + mode.name + ': {\n' +
        '            name: "' + mode.caption + '",\n' +
        '            highlighter: "' + mode.mode + '",\n' +
        '            extensions: [\n' +
        extensions_pretty.join(',\n') + '\n' +
        '            ]\n' +
        '        }\n' +
        '    }\n' +
        '}\n',
        {flags: 'wx'});

    modesJson.imports.push('./mode/' + mode.name + '.json');
}

modesJson.imports.sort();
fs.writeFileSync('app/config/default/modes.json',
                 JSON.stringify(modesJson, null, 4));
