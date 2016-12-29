"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.match = match;
exports.wrap = wrap;

var _scorer = require("./scorer");

exports.default = {
    match: match,
    wrap: wrap
};

// Return position of character which matches

/**
 *
 * @param {string} string
 * @param {Query} preparedQuery
 * @param {MatchOptions} options
 * @returns {Array.<number>}
 */
// A match list is an array of indexes to characters that match.
// This file should closely follow `scorer` except that it returns an array
// of indexes instead of a score.

function match(string, preparedQuery, options) {
    var allowErrors = options.allowErrors,
        pathSeparator = options.pathSeparator;


    if (!allowErrors && !(0, _scorer.isMatch)(string, preparedQuery.core_lw, preparedQuery.core_up)) {
        return [];
    }
    var string_lw = string.toLowerCase();

    // Full path results
    var matches = computeMatch(string, string_lw, preparedQuery);

    //if there is no matches on the full path, there should not be any on the base path either.
    if (matches.length === 0) {
        return matches;
    }

    // Is there a base path ?
    if (string.indexOf(pathSeparator) > -1) {

        // Base path results
        var baseMatches = basenameMatch(string, string_lw, preparedQuery, pathSeparator);

        // Combine the results, removing duplicate indexes
        matches = mergeMatches(matches, baseMatches);
    }

    return matches;
}

//
// Wrap
//
// Helper around match if you want a string with result wrapped by some delimiter text

/**
 *
 * @param {string} string
 * @param {Query} preparedQuery
 * @param {WrapOptions} options
 * @returns {*}
 */
function wrap(string, preparedQuery, options) {
    var tagClass = options.tagClass,
        tagOpen = options.tagOpen,
        tagClose = options.tagClose;


    if (tagOpen && tagOpen.length) {
        tagOpen = tagOpen.replace("{tagClass}", tagClass);
    }

    if (string === preparedQuery.query) {
        return tagOpen + string + tagClose;
    }

    //Run get position where a match is found
    var matchPositions = match(string, preparedQuery, options);
    var nbMatches = matchPositions.length;

    //If no match return as is
    if (nbMatches === 0) {
        return string;
    }

    //Loop over match positions
    var output = '';
    var matchIndex = -1;
    var strPos = 0;
    while (++matchIndex < nbMatches) {
        var matchPos = matchPositions[matchIndex];

        // Get text before the current match position
        if (matchPos > strPos) {
            output += string.substring(strPos, matchPos);
            strPos = matchPos;
        }

        // Get consecutive matches to wrap under a single tag
        while (++matchIndex < nbMatches) {
            if (matchPositions[matchIndex] === matchPos + 1) {
                matchPos++;
            } else {
                matchIndex--;
                break;
            }
        }

        //Get text inside the match, including current character
        matchPos++;
        if (matchPos > strPos) {
            output += tagOpen;
            output += string.substring(strPos, matchPos);
            output += tagClose;
            strPos = matchPos;
        }
    }

    //Get string after last match
    if (strPos < string.length - 1) {
        output += string.substring(strPos);
    }

    //return wrapped text
    return output;
}

function basenameMatch(subject, subject_lw, preparedQuery, pathSeparator) {

    // Skip trailing slashes
    var end = subject.length - 1;
    while (subject[end] === pathSeparator) {
        end--;
    }

    // Get position of basePath of subject.
    var basePos = subject.lastIndexOf(pathSeparator, end);

    //If no PathSeparator, no base path exist.
    if (basePos === -1) {
        return [];
    }

    // Get the number of folder in query
    var depth = preparedQuery.depth;

    // Get that many folder from subject

    while (depth-- > 0) {
        basePos = subject.lastIndexOf(pathSeparator, basePos - 1);
        if (basePos === -1) {
            return [];
        }
    } //consumed whole subject ?

    // Get basePath match
    basePos++;
    end++;
    return computeMatch(subject.slice(basePos, end), subject_lw.slice(basePos, end), preparedQuery, basePos);
}

//
// Combine two matches result and remove duplicate
// (Assume sequences are sorted, matches are sorted by construction.)
//

function mergeMatches(a, b) {
    var m = a.length;
    var n = b.length;

    if (n === 0) {
        return a.slice();
    }
    if (m === 0) {
        return b.slice();
    }

    var i = -1;
    var j = 0;
    var bj = b[j];
    var out = [];

    while (++i < m) {
        var ai = a[i];

        while (bj <= ai && ++j < n) {
            if (bj < ai) {
                out.push(bj);
            }
            bj = b[j];
        }

        out.push(ai);
    }

    while (j < n) {
        out.push(b[j++]);
    }

    return out;
}

//----------------------------------------------------------------------

//
// Align sequence (used for fuzzaldrin.match)
// Return position of subject characters that match query.
//
// Follow closely scorer.computeScore.
// Except at each step we record what triggered the best score.
// Then we trace back to output matched characters.
//
// Differences are:
// - we record the best move at each position in a matrix, and finish by a traceback.
// - we reset consecutive sequence if we do not take the match.
// - no hit miss limit


function computeMatch(subject, subject_lw, preparedQuery) {
    var offset = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
    var query = preparedQuery.query;
    var query_lw = preparedQuery.query_lw;


    var m = subject.length;
    var n = query.length;

    //this is like the consecutive bonus, but for camelCase / snake_case initials
    var acro_score = (0, _scorer.scoreAcronyms)(subject, subject_lw, query, query_lw).score;

    //Init
    var score_row = new Array(n);
    var csc_row = new Array(n);

    // Directions constants
    var STOP = 0;
    var UP = 1;
    var LEFT = 2;
    var DIAGONAL = 3;

    //Traceback matrix
    var trace = new Array(m * n);
    var pos = -1;

    //Fill with 0
    var j = -1; //0..n-1
    while (++j < n) {
        score_row[j] = 0;
        csc_row[j] = 0;
    }

    var move = void 0;
    var score_diag = void 0;
    var score = void 0;
    var score_up = void 0;
    var csc_diag = void 0;

    var i = -1; //0..m-1
    while (++i < m) {
        //foreach char si of subject

        score = 0;
        score_up = 0;
        csc_diag = 0;

        var si_lw = subject_lw[i];

        j = -1; //0..n-1
        while (++j < n) {
            //foreach char qj of query

            //reset score
            var csc_score = 0;
            var align = 0;
            score_diag = score_up;

            //Compute a tentative match
            if (query_lw[j] === si_lw) {

                var start = (0, _scorer.isWordStart)(i, subject, subject_lw);

                // Forward search for a sequence of consecutive char
                csc_score = csc_diag > 0 ? csc_diag : (0, _scorer.scoreConsecutives)(subject, subject_lw, query, query_lw, i, j, start);

                // Determine bonus for matching A[i] with B[j]
                align = score_diag + (0, _scorer.scoreCharacter)(i, j, start, acro_score, csc_score);
            }

            //Prepare next sequence & match score.
            score_up = score_row[j]; // Current score_up is next run score diag
            csc_diag = csc_row[j];

            //In case of equality, moving UP get us closer to the init of the candidate string.
            if (score > score_up) {
                move = LEFT;
            } else {
                score = score_up;
                move = UP;
            }

            // Only take alignment if it's the absolute best option.
            if (align > score) {
                score = align;
                move = DIAGONAL;
            } else {
                //If we do not take this character, break consecutive sequence.
                // (when consecutive is 0, it'll be recomputed)
                csc_score = 0;
            }

            score_row[j] = score;
            csc_row[j] = csc_score;
            trace[++pos] = score > 0 ? move : STOP;
        }
    }

    // -------------------
    // Go back in the trace matrix
    // and collect matches (diagonals)

    i = m - 1;
    j = n - 1;
    pos = i * n + j;
    var backtrack = true;
    var matches = [];

    while (backtrack && i >= 0 && j >= 0) {
        switch (trace[pos]) {
            case UP:
                i--;
                pos -= n;
                break;
            case LEFT:
                j--;
                pos--;
                break;
            case DIAGONAL:
                matches.push(i + offset);
                j--;
                i--;
                pos -= n + 1;
                break;
            default:
                backtrack = false;
        }
    }

    matches.reverse();
    return matches;
}