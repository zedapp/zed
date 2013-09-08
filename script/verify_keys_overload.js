var fs = require('fs');

var keys = JSON.parse(fs.readFileSync("../app/settings/keys.default.json"));

checkKeys("win");
checkKeys("mac");

function checkKeys(os) {
    var keyMap = {};
    for(var k in keys) {
        var key = keys[k];
        if (typeof key === "string") {
            //console.log("Key", key);
            if(keyMap[key]) {
                console.log("Duplicate", key);
            } else {
                keyMap[key] = true;
            }
        } else if(key[os]) {
            var keyMappings = key[os].split("|");
            keyMappings.forEach(function(keyMapping) {
                //console.log("Key", keyMapping);
                if(keyMap[keyMapping]) {
                    console.log("Duplicate", keyMapping);
                } else {
                    keyMap[keyMapping] = true;
                }
            });
        }
    }
}
