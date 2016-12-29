'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
//
// Detect node.js or browser to set default path separator
//


var objectToString = Object.prototype.toString;

var hasGlobal = typeof global !== 'undefined' && objectToString.call(global) === '[object global]';
var hasProcess = typeof process !== 'undefined' && objectToString.call(process) === '[object process]';
var hasWindow = typeof window !== 'undefined' && objectToString.call(window) === '[object Window]';

var isNode = hasGlobal && hasProcess;
var isBrowser = !isNode && hasWindow;

// On node js we assume the list of candidates match local OS path format.
// While on browser assume that we are dealing with url
// Use 'options.pathSeparator' if you need a behavior different from those assumptions.
var defaultPathSeparator = isNode && process.platform === "win32" ? "\\" : "/";

var root = isBrowser ? window : isNode ? global : {};

var env = exports.env = {
    isNode: isNode,
    isBrowser: isBrowser,
    defaultPathSeparator: defaultPathSeparator,
    global: root
};

exports.default = {
    env: env
};