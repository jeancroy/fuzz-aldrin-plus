
export class FilterState {

    constructor() {

        // Filter result mechanic
        this.isPending = true;
        this.cancelRequest = false;
        this.discardResults = false;
        this.count = 0;

        // Specific to scoring
        this.scoredCandidates = null;
        this.scoreProvider = null;
        this.accessor = null;

    }

}

/**
 * @typedef {Object} FilterResult
 *
 * @method  cancel - stop scoring and return no results.
 * @method  isCanceled - has the filter been canceled.
 * @method  isPending - filter is in progress or haven't started.
 * @method  getProgress - get the count of processed elements.
 *
 */


export class FilterResult {

    /**
     * @param {FilterState} state
     */

    constructor( state ) {

        // Closure over the internal state to avoid manual changes.

        this.cancel = function cancel(keepResults = false){
            state.isPending = false;
            state.cancelRequest = true;
            state.discardResults = !keepResults;
        };

        this.isCanceled = function isCanceled(){
            return state.cancelRequest;
        };

        this.isPending = function isPending(){
            return state.isPending;
        };

        this.getProgress = function getProgress(){
            return state.count;
        };

    }
}