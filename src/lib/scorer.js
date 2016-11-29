//
// Score similarity between two string
//
//  isMatch: Fast detection if all character of needle is in haystack
//  score: Find string similarity using a Smith Waterman algorithm
//         Modified to account for programing scenarios (CamelCase folder/file.ext object.property)
//
// Copyright (C) 2015 Jean Christophe Roy and contributors
// MIT License: http://opensource.org/licenses/MIT


// Base point for a single character match
// This balance making patterns VS position and size penalty.
const wm = 150;

//Fading function
const pos_bonus = 20; // The character from 0..pos_bonus receive a greater bonus for being at the start of string.
const tau_size = 85; // Full path length at which the whole match score is halved.

// Miss count
// When subject[i] is query[j] we register a hit.
// Limiting hit put a boundary on how many permutation we consider to find the best one.
// Helps to speed-up processing of long path and query containing frequent character (eg vowels)
//
// If a spec with frequent repetition fail, increase this.
// This has a direct influence on worst case scenario benchmark.
const miss_coeff = 0.75; //Max number missed consecutive hit = ceil(miss_coeff*query.length) + 5


//
// Main export
//

export default{

    score,
    isMatch,

    // Other exports from the is* and score* families are available as named exports.
    // They are used, amongst other things, to sync scorer and matcher behavior

}


// Manage the logic of testing if there's a match and calling the main scoring function
// Also manage scoring a path and optional character.

export function score(string, query, options) {
    let {preparedQuery, allowErrors} = options;
    if (!allowErrors && !isMatch(string, preparedQuery.core_lw, preparedQuery.core_up)) {
        return 0;
    }
    let string_lw = string.toLowerCase();
    let score = computeScore(string, string_lw, preparedQuery);
    return Math.ceil(score);
}


//
// isMatch:
// Are all (non optional)characters of query in subject, in proper order ?
//

export function isMatch(subject, query_lw, query_up) {
    let m = subject.length;
    let n = query_lw.length;

    if (!m || n > m) {
        return false;
    }

    let i = -1;
    let j = -1;

    //foreach char of query
    while (++j < n) {

        let qj_lw = query_lw.charCodeAt(j);
        let qj_up = query_up.charCodeAt(j);

        // Continue walking the subject from where we have left with previous query char
        // until we have found a character that is either lowercase or uppercase query.
        while (++i < m) {
            let si = subject.charCodeAt(i);
            if (si === qj_lw || si === qj_up) {
                break;
            }
        }

        // If we passed the last char, query is not in subject
        if (i === m) {
            return false;
        }
    }

    // Found every char of query in subject in proper order, match is positive
    return true;
}


//----------------------------------------------------------------------
//
// Main scoring algorithm
//

export function computeScore(subject, subject_lw, preparedQuery) {
    let {query} = preparedQuery;
    let {query_lw} = preparedQuery;

    let m = subject.length;
    let n = query.length;

    let score = 0;

    //----------------------------
    // Abbreviations sequence

    let acro = scoreAcronyms(subject, subject_lw, query, query_lw);
    let acro_score = acro.score;

    // Whole query is abbreviation ?
    // => use that as score
    if (acro.count === n) {
        return scoreExact(n, m, acro_score, acro.pos);
    }

    //----------------------------
    // Exact Match ?
    // => use that as score

    let pos = subject_lw.indexOf(query_lw);
    if (pos > -1) {
        return scoreExactMatch(subject, subject_lw, query, query_lw, pos, n, m);
    }


    //----------------------------
    // Individual characters
    // (Smith Waterman algorithm)


    //Init
    let score_row = new Array(n);
    let csc_row = new Array(n);
    let sz = scoreSize(n, m);

    let miss_budget = Math.ceil(miss_coeff * n) + 5;
    let miss_left = miss_budget;

    //Fill with 0
    let j = -1;
    while (++j < n) {
        score_row[j] = 0;
        csc_row[j] = 0;
    }

    // Limit the search to the active region
    // for example with query `abc`, subject `____a_bc_ac_c____`
    // there's a region before first `a` and after last `c`
    // that can be simplified out of the matching process

    // Before first occurrence in subject of first letter of query, or -1
    let i = subject_lw.indexOf(query_lw[0]);
    if (i > -1) {
        i--;
    }

    // After last occurrence of last letter of query,
    let mm = subject_lw.lastIndexOf(query_lw[n - 1], m);
    if (mm > i) {
        m = mm + 1;
    }

    let csc_invalid = true;

    while (++i < m) {     //foreach char si of subject
        let si_lw = subject_lw[i];

        // if si_lw is not in query
        if (preparedQuery.charCodes[si_lw.charCodeAt(0)] == null) {
            // reset csc_row and move to next
            if (csc_invalid !== true) {
                j = -1;
                while (++j < n) {
                    csc_row[j] = 0;
                }
                csc_invalid = true;
            }
            continue;
        }

        score = 0;
        let score_diag = 0;
        let csc_diag = 0;
        let record_miss = true;
        csc_invalid = false;

        j = -1; //0..n-1
        while (++j < n) {   //foreach char qj of query

            // What is the best gap ?
            // score_up contain the score of a gap in subject.
            // score_left = last iteration of score, -> gap in query.
            let score_up = score_row[j];
            if (score_up > score) {
                score = score_up;
            }

            //Reset consecutive
            let csc_score = 0;

            //Compute a tentative match
            if (query_lw[j] === si_lw) {

                let start = isWordStart(i, subject, subject_lw);

                // Forward search for a sequence of consecutive char
                csc_score = csc_diag > 0 ? csc_diag :
                    scoreConsecutives(subject, subject_lw, query, query_lw, i, j, start);

                // Determine bonus for matching A[i] with B[j]
                let align = score_diag + scoreCharacter(i, j, start, acro_score, csc_score);

                //Are we better using this match or taking the best gap (currently stored in score)?
                if (align > score) {
                    score = align;
                    // reset consecutive missed hit count
                    miss_left = miss_budget;
                } else {
                    // We rejected this match and record a miss.
                    // If budget is exhausted exit
                    if (record_miss && --miss_left <= 0) {
                        return score_row[n - 1] * sz;
                    }
                    record_miss = false;
                }
            }


            //Prepare next sequence & match score.
            score_diag = score_up;
            csc_diag = csc_row[j];
            csc_row[j] = csc_score;
            score_row[j] = score;
        }
    }

    // get highest score so far
    score = score_row[n - 1];
    return score * sz;

}

//
// Boundaries
//
// Is the character at the start of a word, end of the word, or a separator ?
// Fortunately those small function inline well.
//

export function isWordStart(pos, subject, subject_lw) {
    if (pos === 0) {
        return true;
    } // match is FIRST char ( place a virtual token separator before first char of string)
    let curr_s = subject[pos];
    let prev_s = subject[pos - 1];
    return isSeparator(prev_s) || // match FOLLOW a separator
        (  curr_s !== subject_lw[pos] && prev_s === subject_lw[pos - 1] ); // match is Capital in camelCase (preceded by lowercase)
}


export function isWordEnd(pos, subject, subject_lw, len) {
    if (pos === len - 1) {
        return true;
    } // last char of string
    let curr_s = subject[pos];
    let next_s = subject[pos + 1];
    return isSeparator(next_s) || // match IS FOLLOWED BY a separator
        ( curr_s === subject_lw[pos] && next_s !== subject_lw[pos + 1] ); // match is lowercase, followed by uppercase
}

export function isSeparator(c) {
    return c === ' ' || c === '.' || c === '-' || c === '_' || c === '/' || c === '\\';
}
//
// Scoring helper
//

export function scorePosition(pos) {
    if (pos < pos_bonus) {
        let sc = pos_bonus - pos;
        return 100 + (sc * sc);
    } else {
        return Math.max((100 + pos_bonus) - pos, 0);
    }
}

export function scoreSize(n, m) {
    // Size penalty, use the difference of size (m-n)
    return tau_size / ( tau_size + Math.abs(m - n))
}

export function scoreExact(n, m, quality, pos) {
    return 2 * n * ( (wm * quality) + scorePosition(pos) ) * scoreSize(n, m);
}


//
// Shared scoring logic between exact match, consecutive & acronym
// Ensure pattern length dominate the score then refine to take into account case-sensitivity
// and structural quality of the pattern on the overall string (word boundary)
//

export function scorePattern(count, len, sameCase, start, end) {
    let sz = count;

    let bonus = 6; // to ensure consecutive length dominate score, this should be as large other bonus combined
    if (sameCase === count) {
        bonus += 2;
    }
    if (start) {
        bonus += 3;
    }
    if (end) {
        bonus += 1;
    }

    if (count === len) {
        // when we match 100% of query we allow to break the size ordering.
        // This is to help exact match bubble up vs size, depth penalty etc
        if (start) {
            if (sameCase === len) {
                sz += 2;
            } else {
                sz += 1;
            }
        }
        if (end) {
            bonus += 1;
        }
    }

    return sameCase + (sz * ( sz + bonus ));
}


//
// Compute the bonuses for two chars that are confirmed to matches in a case-insensitive way
//

export function scoreCharacter(i, j, start, acro_score, csc_score) {

    // start of string / position of match bonus
    let posBonus = scorePosition(i);

    // match IS a word boundary
    // choose between taking part of consecutive characters or consecutive acronym
    if (start) {
        return posBonus + (wm * ( (acro_score > csc_score ? acro_score : csc_score) + 10  ));
    }

    // normal Match
    return posBonus + (wm * csc_score);
}


//
// Forward search for a sequence of consecutive character.
//

export function scoreConsecutives(subject, subject_lw, query, query_lw, i, j, startOfWord) {
    let m = subject.length;
    let n = query.length;

    let mi = m - i;
    let nj = n - j;
    let k = mi < nj ? mi : nj;

    let sameCase = 0;
    let sz = 0; //sz will be one more than the last qi is sj

    // query_lw[i] is subject_lw[j] has been checked before entering now do case sensitive check.
    if (query[j] === subject[i]) {
        sameCase++;
    }

    //Continue while lowercase char are the same, record when they are case-sensitive match.
    while (++sz < k && query_lw[++j] === subject_lw[++i]) {
        if (query[j] === subject[i]) {
            sameCase++;
        }
    }

    // Faster path for single match.
    // Isolated character match occurs often and are not really interesting.
    // Fast path so we don't compute expensive pattern score on them.
    // Acronym should be addressed with acronym context bonus instead of consecutive.
    if (sz === 1) {
        return 1 + (2 * sameCase);
    }

    return scorePattern(sz, n, sameCase, startOfWord, isWordEnd(i, subject, subject_lw, m));
}


//
// Compute the score of an exact match at position pos.
//

export function scoreExactMatch(subject, subject_lw, query, query_lw, pos, n, m) {

    // Test for word start
    let start = isWordStart(pos, subject, subject_lw);

    // Heuristic
    // If not a word start, test next occurrence
    // - We want exact match to be fast
    // - For exact match, word start has the biggest impact on score.
    // - Testing 2 instances is somewhere between testing only one and testing every instances.

    if (!start) {
        let pos2 = subject_lw.indexOf(query_lw, pos + 1);
        if (pos2 > -1) {
            start = isWordStart(pos2, subject, subject_lw);
            if (start) {
                pos = pos2;
            }
        }
    }

    //Exact case bonus.
    let i = -1;
    let sameCase = 0;
    while (++i < n) {
        if (query[pos + i] === subject[i]) {
            sameCase++;
        }
    }

    let end = isWordEnd((pos + n) - 1, subject, subject_lw, m);

    return scoreExact(n, m, scorePattern(n, n, sameCase, start, end), pos);
}


//
// Acronym prefix
//


class AcronymResult {
    constructor(score, pos, count) {
        this.score = score;
        this.pos = pos;
        this.count = count;
    }
}

let emptyAcronymResult = new AcronymResult(0, 0.1, 0);

export function scoreAcronyms(subject, subject_lw, query, query_lw) {
    let m = subject.length;
    let n = query.length;

    //a single char is not an acronym
    if (m <= 1 || n <= 1) {
        return emptyAcronymResult;
    }

    let count = 0;
    let sepCount = 0;
    let sumPos = 0;
    let sameCase = 0;

    let i = -1;
    let j = -1;

    //foreach char of query
    while (++j < n) {

        let qj_lw = query_lw[j];

        // Separator will not score point but will continue the prefix when present.
        // Test that the separator is in the candidate and advance cursor to that position.
        // If no separator break the prefix

        if (isSeparator(qj_lw)) {
            i = subject_lw.indexOf(qj_lw, i + 1);
            if (i > -1) {
                sepCount++;
                continue;
            } else {
                break;
            }
        }

        // For other characters we search for the first match where subject[i] = query[j]
        // that also happens to be a start-of-word

        while (++i < m) {
            if (qj_lw === subject_lw[i] && isWordStart(i, subject, subject_lw)) {
                if (query[j] === subject[i]) {
                    sameCase++;
                }
                sumPos += i;
                count++;
                break;
            }
        }

        // All of subject is consumed, stop processing the query.
        if (i === m) {
            break;
        }
    }


    // Here, all of query is consumed (or we have reached a character not in acronym)
    // A single character is not an acronym (also prevent division by 0)
    if (count < 2) {
        return emptyAcronymResult;
    }

    // Acronym are scored as start-of-word
    // Unless the acronym is a 1:1 match with candidate then it is upgraded to full-word.
    let fullWord = count === n ? isAcronymFullWord(subject, subject_lw, query, count) : false;
    let score = scorePattern(count, n, sameCase, true, fullWord);

    return new AcronymResult(score, sumPos / count, count + sepCount);
}


//
// Test whether there's a 1:1 relationship between query and acronym of candidate.
// For that to happens
// (a) All character of query must be matched to an acronym of candidate
// (b) All acronym of candidate must be matched to a character of query.
//
// This method check for (b) assuming (a) has been checked before entering.

function isAcronymFullWord(subject, subject_lw, query, nbAcronymInQuery) {
    let m = subject.length;
    let n = query.length;
    let count = 0;

    // Heuristic:
    // Assume one acronym every (at most) 12 character on average
    // This filter out long paths, but then they can match on the filename.
    if (m > 12 * n) {
        return false;
    }

    let i = -1;
    while (++i < m) {
        //For each char of subject
        //Test if we have an acronym, if so increase acronym count.
        //If the acronym count is more than nbAcronymInQuery (number of non separator char in query)
        //Then we do not have 1:1 relationship.
        if (isWordStart(i, subject, subject_lw) && ++count > nbAcronymInQuery) {
            return false;
        }
    }

    return true;
}