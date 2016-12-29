"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Query = undefined;

var _pathScorer = require("./pathScorer");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } //
// Query object
//
// Allow to reuse some quantities computed from query.
// Optional char can optionally be specified in the form of a regular expression.
//


var Query =

/**
 *
 * @param {string} query
 * @param {QueryOptions} options
 */
exports.Query = function Query(query, options) {
    _classCallCheck(this, Query);

    if (query == null || !query.length) {
        return;
    }

    this.query = query;
    this.query_lw = query.toLowerCase();
    this.core = coreChars(query, options.optCharRegEx);
    this.core_lw = this.core.toLowerCase();
    this.core_up = truncatedUpperCase(this.core);
    this.depth = (0, _pathScorer.countDir)(query, query.length, options.pathSeparator);
    this.ext = (0, _pathScorer.getExtension)(this.query_lw);
    this.charCodes = getCharCodes(this.query_lw);
};

//
// Optional chars
// Those char improve the score if present, but will not block the match (score=0) if absent.

var opt_char_re = /[ _\-:\/\\]/g;

/**
 *
 * @param {string} query
 * @param {RegExp} optCharRegEx
 * @returns {string}
 */
function coreChars(query, optCharRegEx) {

    if (optCharRegEx == null) {
        optCharRegEx = opt_char_re;
    }

    return query.replace(optCharRegEx, '');
}

//
// Truncated Upper Case:
// --------------------
//
// A fundamental mechanic is that we are able to keep uppercase and lowercase variant of the strings in sync.
// For that we assume uppercase and lowercase version of the string have the same length.
// Of course unicode being unicode there's exceptions.
// See ftp://ftp.unicode.org/Public/UCD/latest/ucd/SpecialCasing.txt for the list
//
// "Straße".toUpperCase() -> "STRASSE"
// truncatedUpperCase("Straße") -> "STRASE"
// iterating over every character, getting uppercase variant and getting first char of that.
//

function truncatedUpperCase(str) {
    var upper = "";
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = str[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var char = _step.value;

            upper += char.toUpperCase()[0];
        }
    } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
            }
        } finally {
            if (_didIteratorError) {
                throw _iteratorError;
            }
        }
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
    var len = str.length;
    var i = -1;

    var charCodes = [];
    // create map
    while (++i < len) {
        charCodes[str.charCodeAt(i)] = true;
    }

    return charCodes;
}