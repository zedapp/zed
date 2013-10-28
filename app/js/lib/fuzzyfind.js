define(function(require, exports, module) {
    var path = require("./path");
    module.exports = function(files, pattern) {
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
    };
});