scorer = require './scorer'
defaultPathSeparator = scorer.pathSeparator

pluckCandidates = (a) -> a.candidate
sortCandidates = (a, b) -> b.score - a.score

module.exports = (candidates, query, options={}) ->
  scoredCandidates = []

  #See also option parsing on main module for default
  {key, maxResults, maxInners, allowErrors, isPath, useExtensionBonus, optCharRegEx, pathSeparator } = options
  spotLeft = if maxInners? and maxInners > 0 then maxInners else candidates.length
  bKey = key?
  prepQuery = scorer.prepQuery(query, options)

  for candidate in candidates
    string = if bKey then candidate[key] else candidate
    continue unless string
    score = scorer.score(string, query, prepQuery, allowErrors, isPath, useExtensionBonus, pathSeparator)
    if score > 0
      scoredCandidates.push({candidate, score})
      break unless --spotLeft

  # Sort scores in descending order
  scoredCandidates.sort(sortCandidates)

  candidates = scoredCandidates.map(pluckCandidates)

  candidates = candidates[0...maxResults] if maxResults?
  candidates
