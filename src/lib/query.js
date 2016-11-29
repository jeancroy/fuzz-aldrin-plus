//
// Query object
//
// Allow to reuse some quantities computed from query.
// Optional char can optionally be specified in the form of a regular expression.
//
import {countDir, getExtension} from "./pathScorer";

export class Query {

    constructor(query, {optCharRegEx, pathSeparator} = {}) {

        if (query == null || !query.length) {
            return;
        }

        this.query = query;
        this.query_lw = query.toLowerCase();
        this.core = coreChars(query, optCharRegEx);
        this.core_lw = this.core.toLowerCase();
        this.core_up = truncatedUpperCase(this.core);
        this.depth = countDir(query, query.length, pathSeparator);
        this.ext = getExtension(this.query_lw);
        this.charCodes = getCharCodes(this.query_lw);
    }
};


//
// Optional chars
// Those char improve the score if present, but will not block the match (score=0) if absent.

const opt_char_re = /[ _\-:\/\\]/g;

function coreChars(query, optCharRegEx) {

    if (optCharRegEx == null) {
        optCharRegEx = opt_char_re
    }

    return query.replace(optCharRegEx, '');
}

//
// Truncated Upper Case:
// --------------------
//
// A fundamental mechanic is that we are able to keep uppercase and lowercase variant of the strings in sync.
// For that we assume uppercase and lowercase version of the string have the same length. Of course unicode being unicode there's exceptions.
// See ftp://ftp.unicode.org/Public/UCD/latest/ucd/SpecialCasing.txt for the list
//
// "Stra�e".toUpperCase() -> "STRASSE"
// truncatedUpperCase("Stra�e") -> "STRASE"
// iterating over every character, getting uppercase variant and getting first char of that.
//

function truncatedUpperCase(str) {
    let upper = "";
    for (let char of str) {
        upper += char.toUpperCase()[0];
    }
    return upper;
}

//
// Get character codes:
// --------------------
//
// Get character codes map for a given string
//

function getCharCodes(str) {
    let len = str.length;
    let i = -1;

    let charCodes = [];
    // create map
    while (++i < len) {
        charCodes[str.charCodeAt(i)] = true;
    }

    return charCodes;
}
