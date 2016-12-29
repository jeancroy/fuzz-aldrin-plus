"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.score = score;
exports.countDir = countDir;
exports.getExtension = getExtension;
exports.getExtensionScore = getExtensionScore;

var _scorer = require("./scorer");

var tau_depth = 13; //  Directory depth at which the full path influence is halved.
var file_coeff = 1.2; //  Full path is also penalized for length of basename. This adjust a scale factor for that penalty.

exports.default = {
    score: score,
    countDir: countDir,
    getExtensionScore: getExtensionScore
};

//  Manage the logic of testing if there's a match and calling the main scoring function
//  Also manage scoring a path and optional character.

/**
 *
 * @param {string} string
 * @param {Query} preparedQuery
 * @param {ScoringOptions} options
 * @returns {number}
 */

function score(string, preparedQuery, options) {
    var allowErrors = options.allowErrors;

    if (!allowErrors && !(0, _scorer.isMatch)(string, preparedQuery.core_lw, preparedQuery.core_up)) {
        return 0;
    }
    var string_lw = string.toLowerCase();
    var score = (0, _scorer.computeScore)(string, string_lw, preparedQuery, options);
    score = scorePath(string, string_lw, score, preparedQuery, options);
    return Math.ceil(score);
}

// 
//  Score adjustment for path
// 

function scorePath(subject, subject_lw, fullPathScore, preparedQuery, options) {

    if (fullPathScore === 0) {
        return 0;
    }

    var useExtensionBonus = options.useExtensionBonus,
        pathSeparator = options.pathSeparator;

    //  Skip trailing slashes

    var end = subject.length - 1;
    while (subject[end] === pathSeparator) {
        end--;
    }

    //  Get position of basePath of subject.
    var basePos = subject.lastIndexOf(pathSeparator, end);
    var fileLength = end - basePos;

    //  Get a bonus for matching extension
    var extAdjust = 1.0;

    if (useExtensionBonus) {
        extAdjust += getExtensionScore(subject_lw, preparedQuery.ext, basePos, end, 2);
        fullPathScore *= extAdjust;
    }

    //  no basePath, nothing else to compute.
    if (basePos === -1) {
        return fullPathScore;
    }

    //  Get the number of folder in query
    var depth = preparedQuery.depth;

    //  Get that many folder from subject

    while (basePos > -1 && depth-- > 0) {
        basePos = subject.lastIndexOf(pathSeparator, basePos - 1);
    }

    //  Get basePath score, if BaseName is the whole string, no need to recompute
    //  We still need to apply the folder depth and filename penalty.
    var basePathScore = basePos === -1 ? fullPathScore : extAdjust * (0, _scorer.computeScore)(subject.slice(basePos + 1, end + 1), subject_lw.slice(basePos + 1, end + 1), preparedQuery, options);

    //  Final score is linear interpolation between base score and full path score.
    //  For low directory depth, interpolation favor base Path then include more of full path as depth increase
    //
    //  A penalty based on the size of the basePath is applied to fullPathScore
    //  That way, more focused basePath match can overcome longer directory path.

    var alpha = 0.5 * tau_depth / (tau_depth + countDir(subject, end + 1, pathSeparator));
    return alpha * basePathScore + (1 - alpha) * fullPathScore * (0, _scorer.scoreSize)(0, file_coeff * fileLength);
}

// 
//  Count number of folder in a path.
//  (consecutive slashes count as a single directory)
// 

function countDir(path, end, pathSeparator) {
    if (end < 1) {
        return 0;
    }

    var count = 0;
    var i = 0;

    // skip slash at the start of string
    // so `foo/bar` and `/foo/bar` have the same depth.
    while (i < end && path[i] === pathSeparator) {
        i++;
    }

    // scan for path separator
    while (i < end) {

        if (path[i] === pathSeparator) {

            //When path found increase directory depth
            count++;

            //But treat multiple consecutive pathSeparator as one
            while (i < end && path[i] === pathSeparator) {
                i++;
            }
        }

        i++;
    }

    return count;
}

// 
//  Find fraction of extension that is matched by query.
//  For example mf.h prefers myFile.h to myfile.html
//  This need special handling because it give point for not having characters (the `tml` in above example)
// 

function getExtension(str) {
    var pos = str.lastIndexOf(".");
    if (pos < 0) {
        return "";
    } else {
        return str.substr(pos + 1);
    }
}

function getExtensionScore(candidate, ext, startPos, endPos, maxDepth) {
    //  startPos is the position of last slash of candidate, -1 if absent.

    if (ext == null || !ext.length) {
        return 0;
    }

    //  Check that (a) extension exist, (b) it is after the init of the basename
    var pos = candidate.lastIndexOf(".", endPos);
    if (pos <= startPos) {
        return 0;
    } //  (note that startPos >= -1)

    var n = ext.length;
    var m = endPos - pos;

    //  n contain the smallest of both extension length, m the largest.
    if (m < n) {
        n = m;
        m = ext.length;
    }

    // place cursor after dot & count number of matching characters in extension
    pos++;
    var matched = -1;
    while (++matched < n) {
        if (candidate[pos + matched] !== ext[matched]) {
            break;
        }
    }

    //  if nothing found, try deeper for multiple extensions, with some penalty for depth
    if (matched === 0 && maxDepth > 0) {
        return 0.9 * getExtensionScore(candidate, ext, startPos, pos - 2, maxDepth - 1);
    }

    //  cannot divide by zero because m is the largest extension length and we return if either is 0
    return matched / m;
}