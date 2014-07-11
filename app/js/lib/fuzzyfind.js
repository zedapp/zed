define(function(require, exports, module) {
    var path = require("./path");

    // EVEN NEWER fuzzy find implementation
    function escapeRegExp(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

    function fuzzyFilter(pattern, files) {
        var closeMatchRegex = escapeRegExp(pattern);
        closeMatchRegex = closeMatchRegex.split(/\s+/).join(".*?");
        closeMatchRegex = closeMatchRegex.replace(/\\\//g, ".*?\\/.*?");
        var distantMatchRegex = escapeRegExp(pattern).split('').join(".*?");
        var r1 = new RegExp(closeMatchRegex, "i");
        var r2 = new RegExp(distantMatchRegex, "i");
        var matches = [];
        if(!pattern) {
            return files.map(function(f) {
                return {
                    name: f,
                    path: f,
                    score: 1000
                };
            });
        }
        for(var i = 0; i < files.length; i++) {
            var file = files[i];
            var m = r1.exec(file);
            if(m) {
                matches.push({
                    name: file,
                    path: file,
                    score: 100000 - (file.length - m[0].length - m.index)
                });
            } else {
                // Let's try the distant matcher
                var m2 = r2.exec(file);
                if(m2) {
                    matches.push({
                        name: file,
                        path: file,
                        score: 10000 - (file.length - m2[0].length - m2.index)
                    });
                }
            }
        }
        return matches;
    }

    // NEW fuzzy find implementation

    /*
     * Based on:
     * https://github.com/myork/fuzzy
     *
     * Copyright (c) 2012 Matt York
     * Licensed under the MIT license.
     */
    function match(pattern, string) {
        var patternIdx = 0,
            len = string.length,
            totalScore = 0,
            currScore = 0,
            compareString = string.toLowerCase(),
            ch;

        for (var idx = 0; idx < len; idx++) {
            ch = string[idx];
            if (compareString[idx] === pattern[patternIdx]) {
                patternIdx++;

                // consecutive characters should increase the score more than linearly
                currScore += 1 + currScore;
            } else {
                currScore = 0;
            }
            totalScore += currScore;
        }

        // return rendered string if we have a match for every char
        if (patternIdx === pattern.length) {
            return totalScore;
        }

        return null;
    }

    function filter(pattern, arr) {
        pattern = pattern.toLowerCase();
        var results = [];
        var maxLength = 0;
        for (var i = 0; i < arr.length; i++) {
            var str = arr[i];
            var score = match(pattern, str);
            if (score !== null) {
                results.push({
                    name: str,
                    path: str,
                    score: score
                });
                maxLength = Math.max(str.length, maxLength);
            }
        }

        return results;
    }

    function oldFinder(files, pattern) {
        var fileRegex, pathRegex;
        var pathMatches = {};

        function buildResult(match, segments) {
            var runs = [];
            var insideRuns = [];
            var lastRun = false;
            var insideChars = 0;
            var totalChars = 0;
            match.shift(); // ???
            for (var index = 0; index < match.length; index++) {
                var capture = match[index];
                if (capture.length) {
                    var inside = index % 2 !== 0;
                    capture = capture.replace('/', '');
                    totalChars += capture.length;
                    if (inside) {
                        insideChars += capture.length;
                    }
                    if (lastRun && lastRun.inside === inside) {
                        lastRun.string += capture;
                    } else {
                        lastRun = {
                            string: capture,
                            inside: inside
                        };
                        runs.push(lastRun);
                        if (inside) {
                            insideRuns.push(lastRun);
                        }
                    }
                }
            }
            var charRatio = totalChars > 0 ? insideChars / totalChars : 1;
            var runRatio = insideRuns.length > 0 ? segments / insideRuns.length : 1;
            return {
                score: runRatio * charRatio,
                result: runs,
                missed: false
            };
        }

        function matchPath(filename) {
            var segments = filename.split('/').length - 1;
            var dirname = path.dirname(filename);
            if (pathMatches[dirname]) {
                return pathMatches[dirname];
            }
            if (pathRegex) {
                var match = pathRegex.exec(filename);
                return match ? (pathMatches[dirname] = buildResult(match, segments)) : (pathMatches[dirname] = {
                    score: 1,
                    result: dirname,
                    missed: true
                });
            } else {
                return (pathMatches[dirname] = {
                    score: 1,
                    result: dirname,
                    missed: false
                });
            }
        }

        function matchFile(filename, pathMatch) {
            var basename = path.filename(filename);
            var dirname = path.dirname(filename);
            var match = fileRegex.exec(basename);
            if (match) {
                var matchResult = buildResult(match, 1);
                return {
                    path: filename,
                    dirname: dirname,
                    name: basename,
                    pathRuns: pathMatch.result,
                    fileRuns: matchResult.result,
                    score: pathMatch.score * matchResult.score
                };
            } else {
                return false;
            }
        }

        function makePattern(part) {
            function charToPattern(pattern, character) {
                if (pattern.length) {
                    pattern += '([^/]*?)';
                }
                return pattern += '(' + character + ')';
            }
            return part.split('').reduce(charToPattern, '');
        }

        pattern = pattern.replace(/ /g, '');
        var parts = pattern.split('/');
        if (pattern.match(/\/$/)) {
            parts.push('');
        }
        var filePart = parts.pop();
        if (parts.length) {
            pathRegex = new RegExp('^(.*?)' + parts.map(makePattern).join('(.*?/.*?)') + '(.*?)$', 'i');
        }
        fileRegex = new RegExp("^(.*?)" + (makePattern(filePart)) + "(.*)$", "i");

        var matches = [];

        files.forEach(function(filename) {
            var pathMatch = matchPath(filename);
            if (!pathMatch.missed) {
                var fileMatch = matchFile(filename, pathMatch);
                if (fileMatch) {
                    matches.push(fileMatch);
                }
            }
        });

        return matches;
    }


    module.exports = function(files, pattern) {
        return fuzzyFilter(pattern, files);
        // return filter(pattern, files);
        // return oldFinder(files, pattern);
    };
});
