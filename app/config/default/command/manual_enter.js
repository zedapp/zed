var session = require("zed/session");

function getClickable(line, pos) {
    var i = pos.column;
    var type;
    while (i >= 0 && line[i] !== '[' && line[i] !== '`') {
        i--;
    }
    if (line[i] === '[') {
        type = 'bracket';
    } else if (line[i] === '`') {
        type = 'backtick';
    } else {
        return;
    }
    i++;
    var name = '';
    while (i < line.length && line[i] !== ']' && line[i] !== '`') {
        name += line[i];
        i++;
    }
    if (line[i] !== ']' && line[i] !== '`') {
        return;
    }
    return {
        type: type,
        name: name
    };
}

module.exports = function(info) {
    var lines = info.inputs.lines;
    var cursor = info.inputs.cursor;

    var line = lines[cursor.row];

    var clickable = getClickable(line, cursor);
    if(!clickable) {
        return;
    }
    if(clickable.type === 'bracket') {
        return session.goto('/' + clickable.name + '.md');
    } else if(clickable.type === 'backtick' && clickable.name.indexOf(':') !== -1) {
        return session.callCommand(info.path, clickable.name);
    }
};
