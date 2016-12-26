export class FilterStateInternal {

    constructor() {
        this.isActive = false;
        this.shouldAbort = false;
        this.discardResults = false;
        this.count = 0;
        this.scoredCandidates = null;
        this.accessor = null;
        this.scoreProvider = null;
    }

}


export class FilterState {

    /**
     * @param {FilterStateInternal} internalState
     */

    constructor( internalState ) {

        // Closure over the internal state to make it read-only.

        this.abort = function abort(keepResults = false){
            internalState.isActive = false;
            internalState.shouldAbort = true;
            internalState.discardResults = !keepResults;
        };

        this.isActive = function isActive(){
            return internalState.isActive;
        };

        this.isCanceled = function isCanceled(){
            return internalState.shouldAbort;
        };

        this.getProgressCount = function getProgressCount(){
            return internalState.count;
        };

    }
}