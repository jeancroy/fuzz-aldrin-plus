"use strict";function score(e,r,t){var o=t.preparedQuery,n=t.allowErrors;if(!n&&!(0,_scorer.isMatch)(e,o.core_lw,o.core_up))return 0;var s=e.toLowerCase(),c=(0,_scorer.computeScore)(e,s,t);return c=scorePath(e,s,c,t),Math.ceil(c)}function scorePath(e,r,t,o){if(0===t)return 0;for(var n=o.preparedQuery,s=o.useExtensionBonus,c=o.pathSeparator,i=e.length-1;e[i]===c;)i--;var u=e.lastIndexOf(c,i),a=i-u,f=1;if(s&&(f+=getExtensionScore(r,n.ext,u,i,2),t*=f),u===-1)return t;for(var x=n.depth;u>-1&&x-- >0;)u=e.lastIndexOf(c,u-1);var l=u===-1?t:f*(0,_scorer.computeScore)(e.slice(u+1,i+1),r.slice(u+1,i+1),o),p=.5*tau_depth/(tau_depth+countDir(e,i+1,c));return p*l+(1-p)*t*(0,_scorer.scoreSize)(0,file_coeff*a)}function countDir(e,r,t){if(r<1)return 0;for(var o=0,n=0;n<r&&e[n]===t;)n++;for(;n<r;){if(e[n]===t)for(o++;n<r&&e[n]===t;)n++;n++}return o}function getExtension(e){var r=e.lastIndexOf(".");return r<0?"":e.substr(r+1)}function getExtensionScore(e,r,t,o,n){if(null==r||!r.length)return 0;var s=e.lastIndexOf(".",o);if(s<=t)return 0;var c=r.length,i=o-s;i<c&&(c=i,i=r.length),s++;for(var u=-1;++u<c&&e[s+u]===r[u];);return 0===u&&n>0?.9*getExtensionScore(e,r,t,s-2,n-1):u/i}Object.defineProperty(exports,"__esModule",{value:!0}),exports.score=score,exports.countDir=countDir,exports.getExtension=getExtension,exports.getExtensionScore=getExtensionScore;var _scorer=require("./scorer"),tau_depth=13,file_coeff=1.2;exports.default={score:score,countDir:countDir,getExtensionScore:getExtensionScore};