"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.filterSync = filterSync;
exports.filterAsync = filterAsync;

var _scorer = require("./scorer");

var _scorer2 = _interopRequireDefault(_scorer);

var _pathScorer = require("./pathScorer");

var _pathScorer2 = _interopRequireDefault(_pathScorer);

var _utils = require("./utils");

var _filterState = require("../definitions/filterState");

var _env = require("./env");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
    filterSync: filterSync,
    filterAsync: filterAsync
};

/**
 *
 * @param {Array|Iterable} candidates
 * @param {Query} preparedQuery
 * @param {FilterOptions} options
 * @returns {Array}
 */

function filterSync(candidates, preparedQuery, options) {
    var filterState = new _filterState.FilterState();
    return executeFilter(candidates, preparedQuery, filterState, options);
}

/**
 *
 * @param {Array|Iterable} candidates
 * @param {Query} preparedQuery
 * @param {FilterOptions} options
 * @param {filterCallback} callback
 * @returns {FilterResult}
 */

function filterAsync(candidates, preparedQuery, callback, options) {

    var filterState = new _filterState.FilterState();
    var filterResult = new _filterState.FilterResult(filterState);
    var PromiseCtor = options.promiseImplementation;

    if ((0, _utils.isFunction)(PromiseCtor)) {
        filterState.promise = new PromiseCtor(function (resolve, reject) {
            var matches = executeFilter(candidates, preparedQuery, filterState, options);
            dispatchResult(matches, filterResult, callback, resolve, reject);
        });
    } else {
        defer(function () {
            var matches = executeFilter(candidates, preparedQuery, filterState, options);
            dispatchResult(matches, filterResult, callback, null, null);
        });
    }

    return filterResult;
}

/**
 *
 * @param {Array|Iterable} candidates
 * @param {Query} preparedQuery
 * @param {FilterState} state
 * @param {FilterOptions} options
 * @returns {Array}
 */

function executeFilter(candidates, preparedQuery, state, options) {

    if (state.cancelRequest) return [];

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
        accessor = (0, _utils.isFunction)(options.key) ? options.key : function (x) {
            return x[key];
        };
    }

    // Init state
    state.isPending = true;
    state.accessor = accessor;
    state.scoreProvider = usePathScoring ? _pathScorer2.default : _scorer2.default;
    state.scoredCandidates = [];

    // Iterate candidate list and collect scored positive matches.
    processCollection(candidates, preparedQuery, state, options);

    // Collect positives matches
    var scoredCandidates = state.scoredCandidates;

    // Cleanup
    state.scoredCandidates = null;
    state.isPending = false;

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

function processCollection(collection, preparedQuery, state, options) {

    //
    // Collection is an array
    //

    if ((0, _utils.isArray)(collection)) {
        for (var i = 0; i <= collection.length; i++) {
            if (!processItem(collection[i], preparedQuery, state, options)) break;
        }
        return true;
    }

    //
    // Collection is an Iterable or Iterator (es6 protocol)
    //

    var iterator = (0, _utils.getIterator)(collection);
    if (iterator != null) {
        var item = iterator.next();
        if ((0, _utils.isIteratorItem)(item)) {
            while (!item.done) {
                if (!processItem(item.value, preparedQuery, state, options)) break;
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
    if ((0, _utils.isFunction)(collection.forEach)) {
        collection.forEach(function (item) {
            return cont = cont && processItem(item, preparedQuery, state, options);
        });
        return true;
    }

    return false;
}

/**
 *
 * @param {string|object} candidate
 * @param {Query} preparedQuery
 * @param {FilterState} context
 * @param {FilterOptions} options
 * @returns {boolean}
 */

function processItem(candidate, preparedQuery, context, options) {

    if (context.cancelRequest) return false;
    context.count++;

    var accessor = context.accessor,
        scoredCandidates = context.scoredCandidates,
        scoreProvider = context.scoreProvider;

    // Get the string representation of candidate

    var string = accessor != null ? accessor(candidate) : candidate;
    if (string == null || !string.length) return true;

    // Get score, If score greater than 0 add to valid results
    var score = scoreProvider.score(string, preparedQuery, options);
    if (score > 0) scoredCandidates.push({ candidate: candidate, score: score });

    return true;
}

function pluckCandidates(a) {
    return a.candidate;
}

function sortCandidates(a, b) {
    return b.score - a.score;
}

var defer = (0, _utils.isFunction)(_env.env.global.setImmediate) ? _env.env.global.setImmediate : function (sheduled) {
    return setTimeout(scheduled, 0);
};

function dispatchResult(matches, filterResult, callback, promiseResolve, promiseReject) {

    if ((0, _utils.isFunction)(callback)) {
        callback.call(null, matches, filterResult);
    }

    if (filterResult.isCanceled()) {
        if ((0, _utils.isFunction)(promiseReject)) {
            promiseReject.call(null, matches);
        }
    } else {
        if ((0, _utils.isFunction)(promiseResolve)) {
            promiseResolve.call(null, matches);
        }
    }
}