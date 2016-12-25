export default {
    isFunction,
    isArray,
    getIterator
};

export function isFunction(fn){
    return typeof fn === "function"
}

export function isArray(tentativeArray){

    if( isFunction(Array.isArray) ){
        return Array.isArray(tentativeArray);
    }

    return Object.prototype.toString.call(tentativeArray) === "[object Array]";

}

//
// Es6 compatible iterator.
// Follow convention of ImmutableJS
//

const REAL_ITERATOR_SYMBOL = (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") ? Symbol.iterator : null;
const FAUX_ITERATOR_SYMBOL = '@@iterator';

export function getIterator(object){

    // Implement real es6 iterator
    if(REAL_ITERATOR_SYMBOL != null && isFunction(object[REAL_ITERATOR_SYMBOL]) ) {
        return object[REAL_ITERATOR_SYMBOL]();
    }

    // es6 like but does not support symbol
    if( isFunction(object[REAL_ITERATOR_SYMBOL]) ){
        return object[FAUX_ITERATOR_SYMBOL]();
    }

    // object itself is an iterator ( instead of having an iterator getter )
    //if(isFunction(object.next)){
    //    return object;
    //}

}
