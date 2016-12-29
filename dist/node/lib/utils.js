"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

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
    return !!fn && Object.prototype.toString.call(fn) === '[object Function]';
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