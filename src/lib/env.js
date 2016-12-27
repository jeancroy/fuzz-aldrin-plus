//
// Detect node.js or browser to set default path separator
//

let isNode = (typeof process === 'object' && Object.prototype.toString.call(process) === '[object process]');
let isBrowser = !isNode && (typeof window === 'object' && Object.prototype.toString.call(window) === "[object Window]");

// On node js we assume the list of candidates match local OS path format.
// While on browser assume that we are dealing with url
// Use 'options.pathSeparator' if you need a behavior different from those assumptions.
let defaultPathSeparator = ( isNode && process.platform === "win32") ? "\\" : "/";

export let env = {
    isNode,
    isBrowser,
    defaultPathSeparator
};

export default{
    env
}