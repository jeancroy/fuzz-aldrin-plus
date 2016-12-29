import scorer from "./scorer";
import pathScorer from "./pathScorer";
import {isFunction, isArray, getIterator, isIteratorItem} from "./utils";
import {FilterResult, FilterState} from '../definitions/filterState'
import {env} from "./env"



export default {
    filterSync,
    filterAsync
};

/**
 *
 * @param {Array|Iterable} candidates
 * @param {Query} preparedQuery
 * @param {FilterOptions} options
 * @returns {Array}
 */

export function filterSync(candidates, preparedQuery,  options) {
    let filterState = new FilterState();
    return executeFilter(candidates, preparedQuery, filterState, options)
}

/**
 *
 * @param {Array|Iterable} candidates
 * @param {Query} preparedQuery
 * @param {FilterOptions} options
 * @param {filterCallback} callback
 * @returns {FilterResult}
 */


export function filterAsync(candidates, preparedQuery,  callback, options) {

    let filterState = new FilterState();
    let filterResult = new FilterResult(filterState);
    let PromiseCtor = options.promiseImplementation;

    if(isFunction(PromiseCtor)){
        filterState.promise = new PromiseCtor(
            (resolve, reject) => {
                let matches =  executeFilter(candidates, preparedQuery, filterState, options);
                dispatchResult( matches, filterResult, callback, resolve, reject )
            }
        )
    }else{
        defer( () => {
            let matches =  executeFilter(candidates, preparedQuery, filterState, options);
            dispatchResult( matches, filterResult, callback, null, null )
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

    if(state.cancelRequest) return [];

    // See option parsing on main module for default
    const {key, maxResults, outputScore, usePathScoring} = options;

    // If list of object, we need to get the string to be scored, as defined by options.key
    // If the key is a method, that method should take an object and return the string.
    // Else we assume it is the name of a property on candidate object.
    let accessor = null;
    if(key != null){
        accessor =  isFunction(options.key) ? options.key : (x) => x[key]
    }

    // Init state
    state.isPending = true;
    state.accessor = accessor;
    state.scoreProvider = usePathScoring ? pathScorer : scorer;
    state.scoredCandidates = [];

    // Iterate candidate list and collect scored positive matches.
    processCollection(candidates, preparedQuery, state, options);

    // Collect positives matches
    let scoredCandidates = state.scoredCandidates;

    // Cleanup
    state.scoredCandidates = null;
    state.isPending = false;

    // Quick exit
    if(state.discardResults || scoredCandidates==null || !scoredCandidates.length ) return [];

    // Sort scores in descending order
    scoredCandidates.sort(sortCandidates);

    // Trim to maxResults if specified
    if (maxResults != null) {
        scoredCandidates = scoredCandidates.slice(0, maxResults);
    }

    // Return either a sorted list of candidate or list of candidate-score pairs.
    if(outputScore === true){
        return scoredCandidates;
    }else{
        // Extract original candidate and return
        return scoredCandidates.map(pluckCandidates);
    }

}

function processCollection(collection, preparedQuery, state, options){

    //
    // Collection is an array
    //

    if( isArray(collection) ){
        for(let i = 0; i<= collection.length; i++){
            if( !processItem( collection[i], preparedQuery, state, options) ) break;
        }
        return true;
    }

    //
    // Collection is an Iterable or Iterator (es6 protocol)
    //

    let iterator = getIterator(collection);
    if(iterator != null){
        let item = iterator.next();
        if(isIteratorItem(item)){
            while(!item.done){
                if( !processItem( item.value, preparedQuery, state, options) ) break;
                item = iterator.next()
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

    let cont = true;
    if( isFunction(collection.forEach) ) {
        collection.forEach((item) => cont = cont && processItem(item, preparedQuery, state, options));
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

function processItem(candidate, preparedQuery, context, options){

    if(context.cancelRequest) return false;
    context.count++;

    let {accessor, scoredCandidates, scoreProvider } = context;

    // Get the string representation of candidate
    let string = accessor != null ? accessor(candidate) : candidate;
    if (string == null || !string.length) return true;

    // Get score, If score greater than 0 add to valid results
    let score = scoreProvider.score(string, preparedQuery, options);
    if (score > 0) scoredCandidates.push({candidate, score});

    return true;

}


function pluckCandidates(a) {
    return a.candidate;
}

function sortCandidates(a, b) {
    return b.score - a.score;
}

let defer = isFunction(env.global.setImmediate)
    ? env.global.setImmediate
    : (sheduled) => setTimeout(scheduled,0);

function dispatchResult( matches, filterResult, callback, promiseResolve, promiseReject ){

    if(isFunction(callback)){
        callback.call(null, matches, filterResult)
    }

    if(filterResult.isCanceled()){
        if(isFunction(promiseReject)) {
            promiseReject.call(null, matches)
        }

    }else{
        if(isFunction(promiseResolve)) {
            promiseResolve.call(null, matches)
        }
    }

}