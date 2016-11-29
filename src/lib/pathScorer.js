import {isMatch, computeScore, scoreSize} from "./scorer";


const tau_depth = 13; //  Directory depth at which the full path influence is halved.
const file_coeff = 1.2; //  Full path is also penalized for length of basename. This adjust a scale factor for that penalty.

export default{
    score,
    countDir,
    getExtensionScore
}

//  Manage the logic of testing if there's a match and calling the main scoring function
//  Also manage scoring a path and optional character.

export function score(string, query, options) {
    let {preparedQuery, allowErrors} = options;
    if (!allowErrors && !isMatch(string, preparedQuery.core_lw, preparedQuery.core_up)) {
        return 0;
    }
    let string_lw = string.toLowerCase();
    let score = computeScore(string, string_lw, preparedQuery);
    score = scorePath(string, string_lw, score, options);
    return Math.ceil(score);
}


// 
//  Score adjustment for path
// 

function scorePath(subject, subject_lw, fullPathScore, options) {

    if (fullPathScore === 0) {
        return 0;
    }

    let {preparedQuery, useExtensionBonus, pathSeparator} = options;

    //  Skip trailing slashes
    let end = subject.length - 1;
    while (subject[end] === pathSeparator) {
        end--;
    }

    //  Get position of basePath of subject.
    let basePos = subject.lastIndexOf(pathSeparator, end);
    let fileLength = end - basePos;

    //  Get a bonus for matching extension
    let extAdjust = 1.0;

    if (useExtensionBonus) {
        extAdjust += getExtensionScore(subject_lw, preparedQuery.ext, basePos, end, 2);
        fullPathScore *= extAdjust;
    }

    //  no basePath, nothing else to compute.
    if (basePos === -1) {
        return fullPathScore;
    }

    //  Get the number of folder in query
    let {depth} = preparedQuery;

    //  Get that many folder from subject
    while (basePos > -1 && depth-- > 0) {
        basePos = subject.lastIndexOf(pathSeparator, basePos - 1);
    }

    //  Get basePath score, if BaseName is the whole string, no need to recompute
    //  We still need to apply the folder depth and filename penalty.
    let basePathScore = (basePos === -1) ? fullPathScore :
    extAdjust * computeScore(subject.slice(basePos + 1, end + 1), subject_lw.slice(basePos + 1, end + 1), preparedQuery);

    //  Final score is linear interpolation between base score and full path score.
    //  For low directory depth, interpolation favor base Path then include more of full path as depth increase
    //
    //  A penalty based on the size of the basePath is applied to fullPathScore
    //  That way, more focused basePath match can overcome longer directory path.

    let alpha = (0.5 * tau_depth) / ( tau_depth + countDir(subject, end + 1, pathSeparator) );
    return (alpha * basePathScore) + ((1 - alpha) * fullPathScore * scoreSize(0, file_coeff * (fileLength)));
}


// 
//  Count number of folder in a path.
//  (consecutive slashes count as a single directory)
// 

export function countDir(path, end, pathSeparator) {
    if (end < 1) {
        return 0;
    }

    let count = 0;
    let i = -1;

    // skip slash at the start so `foo/bar` and `/foo/bar` have the same depth.
    while (++i < end && path[i] === pathSeparator) {
    }

    while (++i < end) {
        if (path[i] === pathSeparator) {
            count++; // record first slash, but then skip consecutive ones
            while (++i < end && path[i] === pathSeparator) {
            }
        }
    }

    return count;
}

// 
//  Find fraction of extension that is matched by query.
//  For example mf.h prefers myFile.h to myfile.html
//  This need special handling because it give point for not having characters (the `tml` in above example)
// 

export function getExtension(str) {
    let pos = str.lastIndexOf(".");
    if (pos < 0) {
        return "";
    } else {
        return str.substr(pos + 1);
    }
}


export function getExtensionScore(candidate, ext, startPos, endPos, maxDepth) {
    //  startPos is the position of last slash of candidate, -1 if absent.

    if (ext == null || !ext.length) {
        return 0;
    }

    //  Check that (a) extension exist, (b) it is after the start of the basename
    let pos = candidate.lastIndexOf(".", endPos);
    if (pos <= startPos) {
        return 0;
    } //  (note that startPos >= -1)

    let n = ext.length;
    let m = endPos - pos;

    //  n contain the smallest of both extension length, m the largest.
    if (m < n) {
        n = m;
        m = ext.length;
    }

    // place cursor after dot & count number of matching characters in extension
    pos++;
    let matched = -1;
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
