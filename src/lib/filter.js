import scorer from "./scorer";
import pathScorer from "./pathScorer";
import utils from "./utils";
import {FilterState, FilterStateInternal} from './filterState'


export default {
    filterSync,
    filterAsync
};

/**
 *
 * @param {Array|Iterable} candidates
 * @param {string} query
 * @param {FilterOptions} options
 * @returns {Array}
 */

export function filterSync(candidates, query,  options) {
    let state = new FilterStateInternal();
    return executeFilter(candidates, query, state, options)
}

/**
 *
 * @param {Array|Iterable} candidates
 * @param {string} query
 * @param {FilterOptions} options
 * @param {filterCallback} callback
 * @returns {FilterState}
 */


export function filterAsync(candidates, query,  callback, options) {

    let internalState = new FilterStateInternal();
    let publicState = new FilterState(internalState);

    let scheduled = () => {
        callback( executeFilter(candidates, query, internalState, options), publicState );
    };

    if(typeof setImmediate === "function"){
        setImmediate(scheduled)
    }else{
        setTimeout(scheduled,0)
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

    if(state.shouldAbort) return [];

    // See option parsing on main module for default
    const {key, maxResults, outputScore, usePathScoring} = options;

    // If list of object, we need to get the string to be scored, as defined by options.key
    // If the key is a method, that method should take an object and return the string.
    // Else we assume it is the name of a property on candidate object.
    let accessor = null;
    if(key != null){
        accessor =  utils.isFunction(options.key) ? options.key : (x) => x[key]
    }

    // Init state
    state.isActive = true;
    state.accessor = accessor;
    state.scoreProvider = usePathScoring ? pathScorer : scorer;
    state.scoredCandidates = [];

    // Iterate candidate list and collect scored positive matches.
    processCollection(candidates, query, state, options);

    // Collect positives matches
    let scoredCandidates = state.scoredCandidates;

    // Cleanup
    state.scoredCandidates = null;
    state.isActive = false;

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

function processCollection(collection, query, state, options){

    //
    // Collection is an array
    //

    if( utils.isArray(collection) ){
        for(let i = 0; i<= collection.length; i++){
            if( !processItem( collection[i], query, state, options) ) break;
        }
        return true;
    }

    //
    // Collection is an Iterable or Iterator (es6 protocol)
    //

    let iterator = utils.getIterator(collection);
    if(iterator != null){
        let item = iterator.next();
        if(utils.isIteratorItem(item)){
            while(!item.done){
                if( !processItem( item.value, query, state, options) ) break;
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
    if( utils.isFunction(collection.forEach) ) {
        collection.forEach((item) => cont = cont && processItem(item, query, state, options));
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

function processItem(candidate, query, context, options){

    if(context.shouldAbort) return false;
    context.count++;

    let {accessor, scoredCandidates, scoreProvider } = context;

    // Get the string representation of candidate
    let string = accessor != null ? accessor(candidate) : candidate;
    if (string == null || !string.length) return true;

    // Get score, If score greater than 0 add to valid results
    let score = scoreProvider.score(string, query, options);
    if (score > 0) scoredCandidates.push({candidate, score});

    return true;

}


function pluckCandidates(a) {
    return a.candidate;
}

function sortCandidates(a, b) {
    return b.score - a.score;
}