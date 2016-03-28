scorer = require './scorer'

pluckCandidates = (a) -> a.candidate
sortCandidates = (a, b) -> b.score - a.score
PathSeparator = require('path').sep

module.exports = (candidates, query, {key, maxResults, maxInners, allowErrors, isPath, useExtensionBonus, optCharRegEx }={}) ->
  scoredCandidates = []
  spotLeft = if maxInners? and maxInners > 0 then maxInners else candidates.length

  allowErrors ?= false
  isPath ?= true
  useExtensionBonus ?= true

  bKey = key?
  prepQuery = scorer.prepQuery(query, optCharRegEx)

  for candidate in candidates
    string = if bKey then candidate[key] else candidate
    continue unless string
    score = scorer.score(string, query, prepQuery, allowErrors, isPath, useExtensionBonus)
    if score > 0
      scoredCandidates.push({candidate, score})
      break unless --spotLeft

  # Sort scores in descending order
  scoredCandidates.sort(sortCandidates)

  candidates = scoredCandidates.map(pluckCandidates)

  candidates = candidates[0...maxResults] if maxResults?
  candidates
