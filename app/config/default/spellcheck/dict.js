var configfs = require("zed/config_fs");
var Typo = require("./typo.js");

var affData = null;
var wordsData = null;
var dict;

function loadDict(callback) {
    if (dict) {
        callback(null, dict);
    } else {
        configfs.readFile("/default/spellcheck/en_US/en_US.aff", function(err, affData_) {
            if (err) {
                return callback(err);
            }
            affData = affData_;
            configfs.readFile("/default/spellcheck/en_US/en_US.dic", function(err, wordsData_) {
                if (err) {
                    return callback(err);
                }
                
                wordsData = wordsData_;

                dict = new Typo("en_US", affData, wordsData);
                callback(null, dict);
            });
        });
    }
}

exports.loadDict = loadDict;