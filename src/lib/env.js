//
// Detect node.js or browser to set default path separator
//


let objectToString = Object.prototype.toString;

let hasGlobal =  (typeof global !== 'undefined' && objectToString.call(global) === '[object global]');
let hasProcess = (typeof process !== 'undefined' && objectToString.call(process) === '[object process]');
let hasWindow =  (typeof window !== 'undefined' && objectToString.call(window) === '[object Window]');

let isNode = hasGlobal && hasProcess;
let isBrowser = !isNode && hasWindow;


// On node js we assume the list of candidates match local OS path format.
// While on browser assume that we are dealing with url
// Use 'options.pathSeparator' if you need a behavior different from those assumptions.
let defaultPathSeparator = ( isNode && process.platform === "win32") ? "\\" : "/";

let root = isBrowser ? window : (isNode ? global : {});


export let env = {
    isNode,
    isBrowser,
    defaultPathSeparator,
    global: root,
};

export default{
    env
}