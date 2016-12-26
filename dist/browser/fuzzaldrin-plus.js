/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	exports.__esModule = true;

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	exports.filter = filter;
	exports.filterAsync = filterAsync;
	exports.score = score;
	exports.match = match;
	exports.wrap = wrap;
	exports.prepareQuery = prepareQuery;

	var _filter = __webpack_require__(2);

	var _scorer = __webpack_require__(3);

	var _pathScorer = __webpack_require__(4);

	var _matcher = __webpack_require__(7);

	var _query = __webpack_require__(8);

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
	 * @param {Array.<(string|object)>|Iterable} candidates - array of string or objects
	 * @param {string} query - string to search for in each candidate
	 * @param {FilterOptions=} options - (optional) see option hash doc
	 * @returns {Array.<(string|object)>} - filtered & sorted subset of input candidates
	 */

	function filter(candidates, query, options) {

	    if (!checkString(query)) return [];
	    if (!checkCollection(candidates)) return [];

	    options = parseOptions(options, query);
	    return (0, _filter.filterSync)(candidates, query, options);
	}

	/**
	 *
	 * @param candidates
	 * @param query
	 * @param options
	 * @param {filterCallback} callback
	 * @returns {FilterState}
	 */

	function filterAsync(candidates, query, callback, options) {

	    if (!checkString(query)) return [];
	    if (!checkCollection(candidates)) return [];

	    options = parseOptions(options, query);
	    return (0, _filter.filterAsync)(candidates, query, callback, options);
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

	    if (!checkString(string)) return 0;
	    if (!checkString(query)) return 0;

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

	    if (!checkString(string)) return "";
	    if (!checkString(query)) return string;

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
	 * @property {string} pathSeparator - If candidate are path, indicate path separator used (usually '/' or '\\').
	 * @property {RegExp} optCharRegEx - Regex that identify character that does not have to match exactly, for example <whitespace>.
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
	 * @property {string|function} key - Name of the property that contain string ot be scored
	 *                                   or function that input candidate and output string to be scored.
	 *
	 * @property {number} maxResults - Output the top `maxResults` best results at most.
	 * @property {bool} outputScore - If true output is an array of {candidate,score} else output is an array of candidates
	 *
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

	//
	// Async
	//

	/**
	 * @callback filterCallback
	 * @param {Array} results
	 * @param {FilterState} state
	 */

	/**
	 * @typedef {Object} FilterState
	 *
	 * @method  abort - stop scoring and return no results.
	 * @method  isActive - is the filter running.
	 * @method  isCanceled - has the filter been canceled.
	 * @method  getProgressCount - get the count of processed elements.
	 *
	 */

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	exports.__esModule = true;
	exports.filterSync = filterSync;
	exports.filterAsync = filterAsync;

	var _scorer = __webpack_require__(3);

	var _scorer2 = _interopRequireDefault(_scorer);

	var _pathScorer = __webpack_require__(4);

	var _pathScorer2 = _interopRequireDefault(_pathScorer);

	var _utils = __webpack_require__(5);

	var _utils2 = _interopRequireDefault(_utils);

	var _filterState = __webpack_require__(6);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	exports.default = {
	    filterSync: filterSync,
	    filterAsync: filterAsync
	};

	/**
	 *
	 * @param {Array|Iterable} candidates
	 * @param {string} query
	 * @param {FilterOptions} options
	 * @returns {Array}
	 */

	function filterSync(candidates, query, options) {
	    var state = new _filterState.FilterStateInternal();
	    return executeFilter(candidates, query, state, options);
	}

	/**
	 *
	 * @param {Array|Iterable} candidates
	 * @param {string} query
	 * @param {FilterOptions} options
	 * @param {filterCallback} callback
	 * @returns {FilterState}
	 */

	function filterAsync(candidates, query, callback, options) {

	    var internalState = new _filterState.FilterStateInternal();
	    var publicState = new _filterState.FilterState(internalState);

	    var scheduled = function scheduled() {
	        callback(executeFilter(candidates, query, internalState, options), publicState);
	    };

	    if (typeof setImmediate === "function") {
	        setImmediate(scheduled);
	    } else {
	        setTimeout(scheduled, 0);
	    }

	    return publicState;
	}

	/**
	 *
	 * @param {Array|Iterable} candidates
	 * @param {string} query
	 * @param {FilterStateInternal} state
	 * @param {FilterOptions} options
	 * @returns {Array}
	 */

	function executeFilter(candidates, query, state, options) {

	    if (state.shouldAbort) return [];

	    // See option parsing on main module for default
	    var key = options.key,
	        maxResults = options.maxResults,
	        outputScore = options.outputScore,
	        usePathScoring = options.usePathScoring;

	    // If list of object, we need to get the string to be scored, as defined by options.key
	    // If the key is a method, that method should take an object and return the string.
	    // Else we assume it is the name of a property on candidate object.

	    var accessor = null;
	    if (key != null) {
	        accessor = _utils2.default.isFunction(options.key) ? options.key : function (x) {
	            return x[key];
	        };
	    }

	    // Init state
	    state.isActive = true;
	    state.accessor = accessor;
	    state.scoreProvider = usePathScoring ? _pathScorer2.default : _scorer2.default;
	    state.scoredCandidates = [];

	    // Iterate candidate list and collect scored positive matches.
	    processCollection(candidates, query, state, options);

	    // Collect positives matches
	    var scoredCandidates = state.scoredCandidates;

	    // Cleanup
	    state.scoredCandidates = null;
	    state.isActive = false;

	    // Quick exit
	    if (state.discardResults || scoredCandidates == null || !scoredCandidates.length) return [];

	    // Sort scores in descending order
	    scoredCandidates.sort(sortCandidates);

	    // Trim to maxResults if specified
	    if (maxResults != null) {
	        scoredCandidates = scoredCandidates.slice(0, maxResults);
	    }

	    // Return either a sorted list of candidate or list of candidate-score pairs.
	    if (outputScore === true) {
	        return scoredCandidates;
	    } else {
	        // Extract original candidate and return
	        return scoredCandidates.map(pluckCandidates);
	    }
	}

	function processCollection(collection, query, state, options) {

	    //
	    // Collection is an array
	    //

	    if (_utils2.default.isArray(collection)) {
	        for (var i = 0; i <= collection.length; i++) {
	            if (!processItem(collection[i], query, state, options)) break;
	        }
	        return true;
	    }

	    //
	    // Collection is an Iterable or Iterator (es6 protocol)
	    //

	    var iterator = _utils2.default.getIterator(collection);
	    if (iterator != null) {
	        var item = iterator.next();
	        if (_utils2.default.isIteratorItem(item)) {
	            while (!item.done) {
	                if (!processItem(item.value, query, state, options)) break;
	                item = iterator.next();
	            }
	            return true;
	        }
	    }

	    //
	    // Collection implements 'forEach'
	    //

	    // Some implementations  of foreach allow to exit using return false. (Eg Immutablejs)
	    //      processItem follow that convention .
	    //
	    // Others cannot be interrupted ( Eg default Array.forEach )
	    //      so we continue iteration but short circuit most of the work.

	    var cont = true;
	    if (_utils2.default.isFunction(collection.forEach)) {
	        collection.forEach(function (item) {
	            return cont = cont && processItem(item, query, state, options);
	        });
	        return true;
	    }

	    return false;
	}

	/**
	 *
	 * @param {string|object} candidate
	 * @param {string} query
	 * @param {FilterStateInternal} context
	 * @param {FilterOptions} options
	 * @returns {boolean}
	 */

	function processItem(candidate, query, context, options) {

	    if (context.shouldAbort) return false;
	    context.count++;

	    var accessor = context.accessor,
	        scoredCandidates = context.scoredCandidates,
	        scoreProvider = context.scoreProvider;

	    // Get the string representation of candidate

	    var string = accessor != null ? accessor(candidate) : candidate;
	    if (string == null || !string.length) return true;

	    // Get score, If score greater than 0 add to valid results
	    var score = scoreProvider.score(string, query, options);
	    if (score > 0) scoredCandidates.push({ candidate: candidate, score: score });

	    return true;
	}

	function pluckCandidates(a) {
	    return a.candidate;
	}

	function sortCandidates(a, b) {
	    return b.score - a.score;
	}

/***/ },
/* 3 */
/***/ function(module, exports) {

	'use strict';

	exports.__esModule = true;
	exports.score = score;
	exports.isMatch = isMatch;
	exports.computeScore = computeScore;
	exports.isWordStart = isWordStart;
	exports.isWordEnd = isWordEnd;
	exports.isSeparator = isSeparator;
	exports.scorePosition = scorePosition;
	exports.scoreSize = scoreSize;
	exports.scoreExact = scoreExact;
	exports.scorePattern = scorePattern;
	exports.scoreCharacter = scoreCharacter;
	exports.scoreConsecutives = scoreConsecutives;
	exports.scoreExactMatch = scoreExactMatch;
	exports.scoreAcronyms = scoreAcronyms;

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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
	var wm = 150;

	//Fading function
	var pos_bonus = 20; // The character from 0..pos_bonus receive a greater bonus for being at the init of string.
	var tau_size = 85; // Full path length at which the whole match score is halved.

	// Miss count
	// When subject[i] is query[j] we register a hit.
	// Limiting hit put a boundary on how many permutation we consider to find the best one.
	// Helps to speed-up processing of long path and query containing frequent character (eg vowels)
	//
	// If a spec with frequent repetition fail, increase this.
	// This has a direct influence on worst case scenario benchmark.
	var miss_coeff = 0.75; //Max number missed consecutive hit = ceil(miss_coeff*query.length) + 5


	//
	// Main export
	//

	exports.default = {

	    score: score,
	    isMatch: isMatch

	};


	// Manage the logic of testing if there's a match and calling the main scoring function
	// Also manage scoring a path and optional character.

	function score(string, query, options) {
	    var preparedQuery = options.preparedQuery,
	        allowErrors = options.allowErrors;

	    if (!allowErrors && !isMatch(string, preparedQuery.core_lw, preparedQuery.core_up)) {
	        return 0;
	    }
	    var string_lw = string.toLowerCase();
	    var score = computeScore(string, string_lw, options);
	    return Math.ceil(score);
	}

	//
	// isMatch:
	// Are all (non optional)characters of query in subject, in proper order ?
	//

	function isMatch(subject, query_lw, query_up) {
	    var m = subject.length;
	    var n = query_lw.length;

	    if (!m || n > m) {
	        return false;
	    }

	    var i = -1;
	    var j = -1;

	    //foreach char of query
	    while (++j < n) {

	        var qj_lw = query_lw.charCodeAt(j);
	        var qj_up = query_up.charCodeAt(j);

	        // Continue walking the subject from where we have left with previous query char
	        // until we have found a character that is either lowercase or uppercase query.
	        while (++i < m) {
	            var si = subject.charCodeAt(i);
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

	function computeScore(subject, subject_lw, options) {
	    var preparedQuery = options.preparedQuery;
	    var query = preparedQuery.query,
	        query_lw = preparedQuery.query_lw;

	    var flexUppercase = true;

	    var m = subject.length;
	    var n = query.length;
	    var current_score = 0;

	    //----------------------------
	    // Abbreviations sequence

	    var acro = scoreAcronyms(subject, subject_lw, query, query_lw);
	    var acro_score = acro.score;

	    // Whole query is abbreviation ?
	    // => use that as score
	    if (acro.count === n) {
	        return scoreExact(n, m, acro_score, acro.pos);
	    }

	    //----------------------------
	    // Exact Match ?
	    // => use that as score

	    var pos = subject_lw.indexOf(query_lw);
	    if (pos > -1) {
	        return scoreExactMatch(subject, subject_lw, query, query_lw, pos, n, m);
	    }

	    //----------------------------
	    // Individual characters
	    // (Smith Waterman algorithm)


	    //Init
	    var score_row = new Array(n);
	    var csc_row = new Array(n);
	    var sz = scoreSize(n, m);

	    var miss_budget = Math.ceil(miss_coeff * n) + 5;
	    var miss_left = miss_budget;

	    //Fill with 0
	    var j = -1;
	    while (++j < n) {
	        score_row[j] = 0;
	        csc_row[j] = 0;
	    }

	    // Limit the search to the isActive region
	    // for example with query `abc`, subject `____a_bc_ac_c____`
	    // there's a region before first `a` and after last `c`
	    // that can be simplified out of the matching process

	    // Before first occurrence in subject of first letter of query, or -1
	    var i = subject_lw.indexOf(query_lw[0]);
	    if (i > -1) {
	        i--;
	    }

	    // After last occurrence of last letter of query,
	    var mm = subject_lw.lastIndexOf(query_lw[n - 1], m);
	    if (mm > i) {
	        m = mm + 1;
	    }

	    var csc_invalid = true;

	    while (++i < m) {
	        //foreach char si of subject

	        var si_lw = subject_lw[i];

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

	        var si = subject_lw[i];

	        current_score = 0;
	        var score_diag = 0;
	        var csc_diag = 0;
	        var record_miss = true;
	        csc_invalid = false;

	        j = -1; //0..n-1
	        while (++j < n) {
	            //foreach char qj of query

	            // What is the best gap ?
	            // score_up contain the score of a gap in subject.
	            // score_left = last iteration of score, -> gap in query.
	            var score_up = score_row[j];
	            if (score_up > current_score) {
	                current_score = score_up;
	            }

	            //Reset consecutive
	            var csc_score = 0;
	            var qj_lw = query_lw[j];

	            // Compute a tentative match
	            // First check case-insesitive match
	            if (qj_lw === si_lw) {

	                // Refine for strict Uppercase
	                //
	                // When do we have a match ?
	                // A) Case Insensitive Match && Not strict Uppercase
	                // B) Case Insensitive Match && Query is lowercase
	                // C) Case Sensitive Match. (Imply Case Insensitive)

	                var qj = query[j];
	                if (flexUppercase || qj_lw === qj || si === qj) {

	                    var start = isWordStart(i, subject, subject_lw);

	                    // Forward search for a sequence of consecutive char
	                    csc_score = csc_diag > 0 ? csc_diag : scoreConsecutives(subject, subject_lw, query, query_lw, i, j, start);

	                    // Determine bonus for matching A[i] with B[j]
	                    var align_score = score_diag + scoreCharacter(i, j, start, acro_score, csc_score);

	                    //Are we better using this match or taking the best gap (currently stored in score)?
	                    if (align_score > current_score) {
	                        current_score = align_score;
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
	            }

	            //Prepare next sequence & match score.
	            score_diag = score_up;
	            csc_diag = csc_row[j];
	            csc_row[j] = csc_score;
	            score_row[j] = current_score;
	        }
	    }

	    // get highest score so far
	    current_score = score_row[n - 1];
	    return current_score * sz;
	}

	//
	// Boundaries
	//
	// Is the character at the init of a word, end of the word, or a separator ?
	// Fortunately those small function inline well.
	//

	function isWordStart(pos, subject, subject_lw) {
	    if (pos === 0) {
	        return true;
	    } // match is FIRST char ( place a virtual token separator before first char of string)
	    var curr_s = subject[pos];
	    var prev_s = subject[pos - 1];
	    return isSeparator(prev_s) || // match FOLLOW a separator
	    curr_s !== subject_lw[pos] && prev_s === subject_lw[pos - 1]; // match is Capital in camelCase (preceded by lowercase)
	}

	function isWordEnd(pos, subject, subject_lw, len) {
	    if (pos === len - 1) {
	        return true;
	    } // last char of string
	    var curr_s = subject[pos];
	    var next_s = subject[pos + 1];
	    return isSeparator(next_s) || // match IS FOLLOWED BY a separator
	    curr_s === subject_lw[pos] && next_s !== subject_lw[pos + 1]; // match is lowercase, followed by uppercase
	}

	function isSeparator(c) {
	    return c === ' ' || c === '.' || c === '-' || c === '_' || c === '/' || c === '\\';
	}
	//
	// Scoring helper
	//

	function scorePosition(pos) {
	    if (pos < pos_bonus) {
	        var sc = pos_bonus - pos;
	        return 100 + sc * sc;
	    } else {
	        return Math.max(100 + pos_bonus - pos, 0);
	    }
	}

	function scoreSize(n, m) {
	    // Size penalty, use the difference of size (m-n)
	    return tau_size / (tau_size + Math.abs(m - n));
	}

	function scoreExact(n, m, quality, pos) {
	    return 2 * n * (wm * quality + scorePosition(pos)) * scoreSize(n, m);
	}

	//
	// Shared scoring logic between exact match, consecutive & acronym
	// Ensure pattern length dominate the score then refine to take into account case-sensitivity
	// and structural quality of the pattern on the overall string (word boundary)
	//

	function scorePattern(count, len, sameCase, start, end) {
	    var sz = count;

	    var bonus = 6; // to ensure consecutive length dominate score, this should be as large other bonus combined
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

	    return sameCase + sz * (sz + bonus);
	}

	//
	// Compute the bonuses for two chars that are confirmed to matches in a case-insensitive way
	//

	function scoreCharacter(i, j, start, acro_score, csc_score) {

	    // init of string / position of match bonus
	    var posBonus = scorePosition(i);

	    // match IS a word boundary
	    // choose between taking part of consecutive characters or consecutive acronym
	    if (start) {
	        return posBonus + wm * ((acro_score > csc_score ? acro_score : csc_score) + 10);
	    }

	    // normal Match
	    return posBonus + wm * csc_score;
	}

	//
	// Forward search for a sequence of consecutive character.
	//

	function scoreConsecutives(subject, subject_lw, query, query_lw, i, j, startOfWord) {
	    var m = subject.length;
	    var n = query.length;

	    var mi = m - i;
	    var nj = n - j;
	    var k = mi < nj ? mi : nj;

	    var sameCase = 0;

	    // query_lw[i] is subject_lw[j] has been checked before entering now do case sensitive check.
	    if (query[j] === subject[i]) {
	        sameCase++;
	    }

	    // size of consecutive
	    // sz will be one more than the last index where query[j] == subject[i] (lowercase)
	    var sz = 0;

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
	        return 1 + 2 * sameCase;
	    }

	    return scorePattern(sz, n, sameCase, startOfWord, isWordEnd(i, subject, subject_lw, m));
	}

	//
	// Compute the score of an exact match at position pos.
	//

	function scoreExactMatch(subject, subject_lw, query, query_lw, pos, n, m) {

	    // Test for word init
	    var start = isWordStart(pos, subject, subject_lw);

	    // Heuristic
	    // If not a word init, test next occurrence
	    // - We want exact match to be fast
	    // - For exact match, word init has the biggest impact on score.
	    // - Testing 2 instances is somewhere between testing only one and testing every instances.

	    if (!start) {
	        var pos2 = subject_lw.indexOf(query_lw, pos + 1);
	        if (pos2 > -1) {
	            start = isWordStart(pos2, subject, subject_lw);
	            if (start) {
	                pos = pos2;
	            }
	        }
	    }

	    //Exact case bonus.
	    var i = -1;
	    var sameCase = 0;
	    while (++i < n) {
	        if (query[pos + i] === subject[i]) {
	            sameCase++;
	        }
	    }

	    var end = isWordEnd(pos + n - 1, subject, subject_lw, m);

	    return scoreExact(n, m, scorePattern(n, n, sameCase, start, end), pos);
	}

	//
	// Acronym prefix
	//


	var AcronymResult = function AcronymResult(score, pos, count) {
	    _classCallCheck(this, AcronymResult);

	    this.score = score;
	    this.pos = pos;
	    this.count = count;
	};

	var emptyAcronymResult = new AcronymResult(0, 0.1, 0);

	function scoreAcronyms(subject, subject_lw, query, query_lw) {
	    var m = subject.length;
	    var n = query.length;

	    //a single char is not an acronym
	    if (m <= 1 || n <= 1) {
	        return emptyAcronymResult;
	    }

	    var count = 0;
	    var sepCount = 0;
	    var sumPos = 0;
	    var sameCase = 0;

	    var i = -1;
	    var j = -1;

	    //foreach char of query
	    while (++j < n) {

	        var qj_lw = query_lw[j];

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
	        // that also happens to be a init-of-word

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

	    // Acronym are scored as init-of-word
	    // Unless the acronym is a 1:1 match with candidate then it is upgraded to full-word.
	    var fullWord = count === n ? isAcronymFullWord(subject, subject_lw, query, count) : false;
	    var score = scorePattern(count, n, sameCase, true, fullWord);

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
	    var m = subject.length;
	    var n = query.length;
	    var count = 0;

	    // Heuristic:
	    // Assume one acronym every (at most) 12 character on average
	    // This filter out long paths, but then they can match on the filename.
	    if (m > 12 * n) {
	        return false;
	    }

	    var i = -1;
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

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	exports.__esModule = true;
	exports.score = score;
	exports.countDir = countDir;
	exports.getExtension = getExtension;
	exports.getExtensionScore = getExtensionScore;

	var _scorer = __webpack_require__(3);

	var tau_depth = 13; //  Directory depth at which the full path influence is halved.
	var file_coeff = 1.2; //  Full path is also penalized for length of basename. This adjust a scale factor for that penalty.

	exports.default = {
	    score: score,
	    countDir: countDir,
	    getExtensionScore: getExtensionScore
	};

	//  Manage the logic of testing if there's a match and calling the main scoring function
	//  Also manage scoring a path and optional character.

	function score(string, query, options) {
	    var preparedQuery = options.preparedQuery,
	        allowErrors = options.allowErrors;

	    if (!allowErrors && !(0, _scorer.isMatch)(string, preparedQuery.core_lw, preparedQuery.core_up)) {
	        return 0;
	    }
	    var string_lw = string.toLowerCase();
	    var score = (0, _scorer.computeScore)(string, string_lw, options);
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

	    var preparedQuery = options.preparedQuery,
	        useExtensionBonus = options.useExtensionBonus,
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
	    var basePathScore = basePos === -1 ? fullPathScore : extAdjust * (0, _scorer.computeScore)(subject.slice(basePos + 1, end + 1), subject_lw.slice(basePos + 1, end + 1), options);

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

/***/ },
/* 5 */
/***/ function(module, exports) {

	"use strict";

	exports.__esModule = true;

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	exports.isFunction = isFunction;
	exports.isArray = isArray;
	exports.getIterator = getIterator;
	exports.isIteratorItem = isIteratorItem;
	exports.default = {
	    isFunction: isFunction,
	    isArray: isArray,
	    getIterator: getIterator,
	    isIteratorItem: isIteratorItem
	};
	function isFunction(fn) {
	    return typeof fn === "function";
	}

	function isArray(tentativeArray) {

	    if (isFunction(Array.isArray)) {
	        return Array.isArray(tentativeArray);
	    }

	    return Object.prototype.toString.call(tentativeArray) === "[object Array]";
	}

	//
	// Es6 compatible iterator.
	// Follow convention of ImmutableJS
	//

	var REAL_ITERATOR_SYMBOL = typeof Symbol === "function" && _typeof(Symbol.iterator) === "symbol" ? Symbol.iterator : null;
	var FAUX_ITERATOR_SYMBOL = '@@iterator';

	function getIterator(object) {

	    if (object == null) return null;

	    // Get iterator from Iterable
	    var iterator = null;
	    if (REAL_ITERATOR_SYMBOL != null && isFunction(object[REAL_ITERATOR_SYMBOL])) {
	        // real es6 Iterable
	        iterator = object[REAL_ITERATOR_SYMBOL]();
	    } else if (isFunction(object[REAL_ITERATOR_SYMBOL])) {
	        // es < 6 fallback.
	        iterator = object[FAUX_ITERATOR_SYMBOL]();
	    }

	    // Ensure that that iterator implements 'next' function
	    if (iterator != null && isFunction(iterator.next)) return iterator;

	    // Test if object itself is iterator-like
	    if (isFunction(object.next)) {
	        return object;
	    }

	    return null;
	}

	function isIteratorItem(item) {
	    return item != null && 'done' in item && 'value' in item;
	}

/***/ },
/* 6 */
/***/ function(module, exports) {

	"use strict";

	exports.__esModule = true;

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var FilterStateInternal = exports.FilterStateInternal = function FilterStateInternal() {
	    _classCallCheck(this, FilterStateInternal);

	    this.isActive = false;
	    this.shouldAbort = false;
	    this.discardResults = false;
	    this.count = 0;
	    this.scoredCandidates = null;
	    this.accessor = null;
	    this.scoreProvider = null;
	};

	var FilterState =

	/**
	 * @param {FilterStateInternal} internalState
	 */

	exports.FilterState = function FilterState(internalState) {
	    _classCallCheck(this, FilterState);

	    // Closure over the internal state to make it read-only.

	    this.abort = function abort() {
	        var keepResults = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

	        internalState.isActive = false;
	        internalState.shouldAbort = true;
	        internalState.discardResults = !keepResults;
	    };

	    this.isActive = function isActive() {
	        return internalState.isActive;
	    };

	    this.isCanceled = function isCanceled() {
	        return internalState.shouldAbort;
	    };

	    this.getProgressCount = function getProgressCount() {
	        return internalState.count;
	    };
	};

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;
	exports.match = match;
	exports.wrap = wrap;

	var _scorer = __webpack_require__(3);

	exports.default = {
	    match: match,
	    wrap: wrap
	};

	// Return position of character which matches

	/**
	 *
	 * @param {string} string
	 * @param {string} query
	 * @param {MatchOptions} options
	 * @returns {Array.<number>}
	 */
	// A match list is an array of indexes to characters that match.
	// This file should closely follow `scorer` except that it returns an array
	// of indexes instead of a score.

	function match(string, query, options) {
	    var allowErrors = options.allowErrors,
	        preparedQuery = options.preparedQuery,
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
	 * @param {string} query
	 * @param {WrapOptions} options
	 * @returns {*}
	 */
	function wrap(string, query, options) {

	    var tagClass = options.tagClass || 'highlight';
	    var tagOpen = options.tagOpen || '<strong class="' + tagClass + '">';
	    var tagClose = options.tagClose || '</strong>';

	    if (string === options.preparedQuery.query) {
	        return tagOpen + string + tagClose;
	    }

	    //Run get position where a match is found
	    var matchPositions = match(string, query, options);
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

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	exports.__esModule = true;
	exports.Query = undefined;

	var _pathScorer = __webpack_require__(4);

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } //
	// Query object
	//
	// Allow to reuse some quantities computed from query.
	// Optional char can optionally be specified in the form of a regular expression.
	//


	var Query = exports.Query = function Query(query) {
	    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
	        optCharRegEx = _ref.optCharRegEx,
	        pathSeparator = _ref.pathSeparator;

	    _classCallCheck(this, Query);

	    if (query == null || !query.length) {
	        return;
	    }

	    this.query = query;
	    this.query_lw = query.toLowerCase();
	    this.core = coreChars(query, optCharRegEx);
	    this.core_lw = this.core.toLowerCase();
	    this.core_up = truncatedUpperCase(this.core);
	    this.depth = (0, _pathScorer.countDir)(query, query.length, pathSeparator);
	    this.ext = (0, _pathScorer.getExtension)(this.query_lw);
	    this.charCodes = getCharCodes(this.query_lw);
	};

	//
	// Optional chars
	// Those char improve the score if present, but will not block the match (score=0) if absent.

	var opt_char_re = /[ _\-:\/\\]/g;

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
	    for (var _iterator = str, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
	        var _ref2;

	        if (_isArray) {
	            if (_i >= _iterator.length) break;
	            _ref2 = _iterator[_i++];
	        } else {
	            _i = _iterator.next();
	            if (_i.done) break;
	            _ref2 = _i.value;
	        }

	        var char = _ref2;

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
	    var len = str.length;
	    var i = -1;

	    var charCodes = [];
	    // create map
	    while (++i < len) {
	        charCodes[str.charCodeAt(i)] = true;
	    }

	    return charCodes;
	}

/***/ }
/******/ ]);
//# sourceMappingURL=fuzzaldrin-plus.js.map