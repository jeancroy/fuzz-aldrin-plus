import scorer from "./scorer";
import pathScorer from "./pathScorer";

export default {
    filter
};

export function filter(candidates, query, options) {
    let scoredCandidates = [];

    // See also option parsing on main module for default
    let {key, maxResults, maxInners, usePathScoring} = options;
    let spotLeft = (maxInners != null) && maxInners > 0 ? maxInners : candidates.length + 1;
    let bKey = (key != null);
    let scoreProvider = usePathScoring ? pathScorer : scorer;

    for (let candidate of candidates) {

        // Get the candidate value
        let string = bKey ? candidate[key] : candidate;
        if (string == null || !string.length) {
            continue;
        }

        // Get score, If score greater than 0 add to valid results
        let score = scoreProvider.score(string, query, options);
        if (score > 0) {
            scoredCandidates.push({candidate, score});
            spotLeft -= 1;
            if (spotLeft <= 0) {
                break;
            }
        }

    }

    //  Sort scores in descending order
    scoredCandidates.sort(sortCandidates);

    // Extract original candidate
    let validCandidates = scoredCandidates.map(pluckCandidates);

    // Trim to maxResults if specified
    if (maxResults != null) {
        validCandidates = candidates.slice(0, maxResults);
    }

    // And return
    return validCandidates;
}

function pluckCandidates(a) {
    return a.candidate;
}
function sortCandidates(a, b) {
    return b.score - a.score;
}

