export default {
    isFunction,
    isArray,
    getIterator,
    isIteratorItem
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

    if(object == null) return null;

    // Get iterator from Iterable
    let iterator = null;
    if(REAL_ITERATOR_SYMBOL != null && isFunction(object[REAL_ITERATOR_SYMBOL]) ) {
        // real es6 Iterable
        iterator =  object[REAL_ITERATOR_SYMBOL]();
    }
    else if( isFunction(object[REAL_ITERATOR_SYMBOL]) ){
        // es < 6 fallback.
        iterator = object[FAUX_ITERATOR_SYMBOL]();
    }

    // Ensure that that iterator implements 'next' function
    if(iterator != null && isFunction(iterator.next))
        return iterator;

    // Test if object itself is iterator-like
    if(isFunction(object.next)){
        return object;
    }

    return null;

}

export function isIteratorItem(item){
    return  item != null && 'done' in item && 'value' in item
}