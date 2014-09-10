var fs = require('fs');

var keys = JSON.parse(fs.readFileSync("app/config/default/keys.json")).keys;

checkKeys("win");
checkKeys("mac");

function checkKeys(os) {
    var keyMap = {};

    function registerAndVerify(key) {
        // console.log(key);
        if(os == "win" && key.indexOf("Command") !== -1) {
            console.error("Found use of Command in Windows key: ", key);
        }
        if (keyMap[key]) {
            console.error("Duplicate", key);
        } else {
            keyMap[key] = true;
        }
    }

    for (var k in keys) {
        var key = keys[k];
        if (typeof key === "string") {
            var keyMappings = key.split("|");
            keyMappings.forEach(registerAndVerify);
        } else if (key[os]) {
            var keyMappings = key[os].split("|");
            keyMappings.forEach(registerAndVerify);
        }
    }
}
