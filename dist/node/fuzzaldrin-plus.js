"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.filter = filter;
exports.score = score;
exports.match = match;
exports.wrap = wrap;
exports.prepareQuery = prepareQuery;

var _filter = require("./lib/filter");

var _scorer = require("./lib/scorer");

var _pathScorer = require("./lib/pathScorer");

var _matcher = require("./lib/matcher");

var _query = require("./lib/query");

var fuzzaldrin = {
    filter: filter,
    score: score,
    match: match,
    wrap: wrap,
    prepareQuery: prepareQuery
};

exports.default = fuzzaldrin;


var preparedQueryCache = null;

/**
 * Filter:
 *  Given a list of candidate, output a list of candidate that match query.
 *  Output list is the same format (string or object) than input list.
 *
 *  If given a list of object, specify options.key as the property `candidate[key]`
 *  that contain the string representation of the candidate
 *
 *  Output is sorted by match score.
 *
 * @param {Array.<(string|object)>} candidates - array of string or objects
 * @param {string} query - string to search for in each candidate
 * @param {FilterOptions=} options - (optional) see option hash doc
 * @returns {Array.<(string|object)>} - filtered & sorted subset of input candidates
 */

function filter(candidates, query, options) {

    if (query == null || !query.length) return [];
    if (candidates == null || !candidates.length) return [];
    options = parseOptions(options, query);
    return (0, _filter.filter)(candidates, query, options);
}

/**
 * Score:
 *   Give the numerical score on how a given string match query.
 *
 *   This is provided so you can build your own filter method.
 *   For example you may have a special way to iterate candidate,
 *   access candidate string representation, or you may need to
 *   modify the score to account external knowledge (eg last modified date)
 *
 * @param {string} string - string representation of a candidate
 * @param {string} query - string to search for in candidate
 * @param {ScoringOptions=} options - (optional) see option hash doc
 * @returns {number} score 0 .. max, where max is score(string, string)
 */

function score(string, query, options) {

    if (string == null || !string.length) return 0;
    if (query == null || !query.length) return 0;

    options = parseOptions(options, query);

    if (options.usePathScoring) {
        return (0, _pathScorer.score)(string, query, options);
    } else {
        return (0, _scorer.score)(string, query, options);
    }
}

/**
 * Match:
 *    Communicate which characters of candidate where selected by the algorithm to represent the query.
 *    The match function output an array of character position.
 *    If you need to display those character as an html string see wrap function.
 *
 * @param {string} string - string representation of a candidate
 * @param {string} query - string to search for in candidate
 * @param {MatchOptions=} options (optional)
 * @returns {Array.<number>}
 */

function match(string, query, options) {

    if (string == null || !string.length) return [];
    if (query == null || !query.length) return [];

    //If both are the same, return an array of consecutive numbers
    if (string === query) {
        var length = string.length;
        var range = new Array(length);
        for (var idx = 0; idx < length; idx++) {
            range[idx] = idx;
        }
        return range;
    }

    options = parseOptions(options, query);
    return (0, _matcher.match)(string, query, options);
}

/**
 * Wrap:
 *    Communicate which characters of candidate where selected by the algorithm to represent the query.
 *    This function output the given string with chosen character wrapped in a delimiter string (eg html tag).
 *
 *    To control the wrap use the option hash.
 *    Here are some default value:
 *      options.tagOpen = `<strong class="highlight">`
 *      options.tagClose = `</strong>`
 *
 *    Alternatively, if you chose to keep the default tagOpen,
 *    you can specify option.tagClass and change the `highlight`
 *    class to one of your choosing.
 *
 *    Wrap method will try to group consecutive matches under the same tag.
 *
 * @param {string} string - string representation of a candidate
 * @param {string} query - string to search for in candidate
 * @param {WrapOptions=} options
 * @returns {string} - input string with match wrapped in open and close tag.
 */

function wrap(string, query, options) {

    if (string == null || !string.length) return "";
    if (query == null || !query.length) return "";

    options = parseOptions(options, query);
    return (0, _matcher.wrap)(string, query, options);
}

/**
 * PrepareQuery:
 *   The usual scenario is to compare a single query with multiple candidate.
 *   To speed that process up, we pre-compute some information about the query.
 *
 *   Pre-computed query is natural to use in bulk method like filter, but harder
 *   in one-by-one method like score or match. To keep those method fast you can give
 *   a pre computed query in option hash as `options.preparedQuery`
 *
 *   Note that we use an internal cache `preparedQueryCache` that cover most of the simple cases
 *   So this method may not be needed in thos cases.
 *
 * @param {string} query
 * @param {QueryOptions} options
 * @returns {Query}
 */

function prepareQuery(query, options) {
    options = parseOptions(options, query);
    return options.preparedQuery;
}

//
// Detect node.js or browser to set default path separator
//

var defaultPathSeparator = "/";

if ((typeof process === "undefined" ? "undefined" : _typeof(process)) === 'object' && Object.prototype.toString.call(process) === '[object process]') {

    // On node js we assume the list of candidates match local OS path format.
    // See comment bellow to change behavior.
    defaultPathSeparator = process.platform === "win32" ? '\\' : '/';
} else if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === 'object' && Object.prototype.toString.call(window) === "[object Window]") {

    // We assume that browser are dealing with url, if assumption is false use option hash like so:
    // fuzzaldrin.filter( candidates, query, {pathSeparator: platformSep} )
    // and determine `platformSep` any so it match the format of candidates.

    defaultPathSeparator = "/";

    // Export main object to global window.
    window.fuzzaldrin = fuzzaldrin;
}

//
// Setup default values
//

/**
 * @type {ScoringOptions}
 */
var defaultOptions = {
    allowErrors: false,
    usePathScoring: true,
    useExtensionBonus: false,
    pathSeparator: defaultPathSeparator,
    optCharRegEx: null,
    preparedQuery: null
};

/**
 *
 * @param {(ScoringOptions|FilterOptions|MatchOptions|WrapOptions)} options
 * @param {string} query
 * @returns {(ScoringOptions|FilterOptions|MatchOptions|WrapOptions)} options completed with default values from ScoringOptions
 */
function parseOptions(options, query) {

    // If no options given, copy default
    // Else merge options with defaults.

    if (options == null) options = {};

    var hasOwnProperty = Object.prototype.hasOwnProperty;
    for (var key in defaultOptions) {
        if (hasOwnProperty.call(defaultOptions, key) && !hasOwnProperty.call(options, key)) {
            options[key] = defaultOptions[key];
        }
    }

    // if preparedQuery is given use it
    // else assign from cache, recompute cache if needed
    if (options.preparedQuery == null) {

        if (preparedQueryCache == null || preparedQueryCache.query !== query) {
            preparedQueryCache = new _query.Query(query, options);
        }
        options.preparedQuery = preparedQueryCache;
    }

    return options;
}

//
// Documentation for option hash
//

/**
 * @typedef {Object} QueryOptions
 * @property {string} pathSeparator - If candidate are path, indicate path seperator used.
 * @property {RegExp} optCharRegEx - Some characters do not have to match exactly, example `space`.
 *
 */

/**
 * @typedef {Object} ScoringOptions
 * @extends QueryOptions
 *
 * @property {boolean} allowErrors - Should we allow candidates that does not have all characters of query ?
 * @property {boolean} usePathScoring - Should we try to interpret candidates as path
 * @property {boolean} useExtensionBonus - Should we try to interpret extension from query
 *                                         and prefer files that match that extension (needs usePathScoring)
 * @property {Query} preparedQuery - If you have a precomputed query object set it here.
 */

/**
 * @typedef {Object} FilterOptions
 * @extends ScoringOptions
 *
 * @property {string} key - Object are given, this is the key of object that contain the string to be scored.
 * @property {number} maxResults - Output the top `maxResults` best results at most.
 * @property {number} maxInners - Speed vs correctness optimisation: stop filtering after that many positive results
 */

/**
 * @typedef {Object} MatchOptions
 * @extends ScoringOptions
 *
 *
 */

/**
 * @typedef {Object} WrapOptions
 * @extends MatchOptions
 *
 * @property {string} tagOpen - string to place before a match default to `<strong class="highlight">`
 * @property {string} tagClose - string to place after a match default to `</strong>`
 * @property {string} tagClass - change the class of the default open tag (tagOpen must be unset)
 *
 */