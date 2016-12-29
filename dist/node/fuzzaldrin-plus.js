"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.filter = filter;
exports.filterAsync = filterAsync;
exports.score = score;
exports.match = match;
exports.wrap = wrap;
exports.prepareQuery = prepareQuery;

var _filter = require("./lib/filter");

var _scorer = require("./lib/scorer");

var _pathScorer = require("./lib/pathScorer");

var _matcher = require("./lib/matcher");

var _query = require("./lib/query");

var _defaultOptions = require("./definitions/defaultOptions");

var _env = require("./lib/env");

var defaultOptions = (0, _defaultOptions.getDefaults)(_env.env);

var fuzzaldrin = {
    filter: filter,
    score: score,
    match: match,
    wrap: wrap,
    prepareQuery: prepareQuery,
    defaultOptions: defaultOptions
};

exports.default = fuzzaldrin;

// Export main object to global window.

if (_env.env.isBrowser) {
    _env.env.global.fuzzaldrin = fuzzaldrin;
}

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
 * @param {Array.<(string|object)>|Iterable} candidates - array of string or objects
 * @param {string} query - string to search for in each candidate
 * @param {FilterOptions=} options - (optional) see option hash doc
 * @returns {Array.<(string|object)>} - filtered & sorted subset of input candidates
 */

function filter(candidates, query, options) {

    if (!checkString(query)) return [];
    if (!checkCollection(candidates)) return [];

    options = parseOptions(options, defaultOptions.filterOptions);
    var preparedQuery = getPreparedQuery(query, options);

    return (0, _filter.filterSync)(candidates, preparedQuery, options);
}

/**
 *
 * @param candidates
 * @param query
 * @param options
 * @param {filterCallback} callback
 * @returns {FilterResult}
 */

function filterAsync(candidates, query, callback, options) {

    if (!checkString(query)) return [];
    if (!checkCollection(candidates)) return [];

    options = parseOptions(options, defaultOptions.filterOptions);
    var preparedQuery = getPreparedQuery(query, options);

    return (0, _filter.filterAsync)(candidates, preparedQuery, callback, options);
}

/**
 * @callback filterCallback
 * @param {Array} results
 * @param {FilterResult} state
 */

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

    if (!checkString(string)) return 0;
    if (!checkString(query)) return 0;

    options = parseOptions(options, defaultOptions.scoringOptions);
    var preparedQuery = getPreparedQuery(query, options);

    if (options.usePathScoring) {
        return (0, _pathScorer.score)(string, preparedQuery, options);
    } else {
        return (0, _scorer.score)(string, preparedQuery, options);
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

    if (!checkString(string)) return [];
    if (!checkString(query)) return [];

    //If both are the same, return an array of consecutive numbers
    if (string === query) {
        var length = string.length;
        var range = new Array(length);
        for (var idx = 0; idx < length; idx++) {
            range[idx] = idx;
        }
        return range;
    }

    options = parseOptions(options, defaultOptions.matchOptions);
    var preparedQuery = getPreparedQuery(query, options);

    return (0, _matcher.match)(string, preparedQuery, options);
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

    if (!checkString(string)) return "";
    if (!checkString(query)) return string;

    options = parseOptions(options, defaultOptions.wrapOptions);
    var preparedQuery = getPreparedQuery(query, options);

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
    options = parseOptions(options);
    return getPreparedQuery(query, options);
}

//
// Input checking
//

function checkString(str) {
    //Not null, must have length property > 0
    return str != null && str.length != null && str.length > 0;
}

function checkCollection(obj) {
    // Not null
    // If object has length or size property, must be != 0
    // Example of thing with size: (es6 sets, ImmutableJs collections)
    return obj != null && obj.length !== 0 && obj.size !== 0;
}

function parseOptions(options, defaultOptions) {

    // If no options given, copy default
    // Else merge options with defaults.
    return (0, _defaultOptions.extend)(defaultOptions, options || {});
}

function getPreparedQuery(query, options) {

    // If prepared query in option hash is valid, use it
    if (options.preparedQuery != null && options.preparedQuery.query === query) return options.preparedQuery;

    // Recompute cache if empty or invalid
    if (preparedQueryCache == null || preparedQueryCache.query !== query) {
        preparedQueryCache = new _query.Query(query, options);
    }

    // Serve from cache
    return preparedQueryCache;
}