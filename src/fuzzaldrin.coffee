scorer = require './scorer'
filter = require './filter'
matcher = require './matcher'

PathSeparator = require('path').sep
prepQueryCache = null

module.exports =

  filter: (candidates, query, options) ->
    return [] unless query?.length and candidates?.length
    filter(candidates, query, options)

  prepQuery: (query) ->
    scorer.prepQuery(query)

#
# While the API is backward compatible,
# the following pattern is recommended for speed.
#
# query = "..."
# prepared = fuzzaldrin.prepQuery(query)
# for candidate in candidates
#    score = fuzzaldrin.score(candidate, query, prepared)
#
# --
# Alternatively we provide caching of prepQuery to ease direct swap of one library to another.
#

  score: (string, query, prepQuery, {allowErrors, isPath, useExtensionBonus, optCharRegEx}={}) ->
    return 0 unless string?.length and query?.length

    # if prepQuery is given -> use it, else if prepQueryCache match the same query -> use cache, else -> compute & cache
    prepQuery ?= if prepQueryCache and prepQueryCache.query is query then prepQueryCache else (prepQueryCache = scorer.prepQuery(query, optCharRegEx))
    allowErrors ?= false
    isPath ?= true
    useExtensionBonus ?= true
    return scorer.score(string, query, prepQuery, allowErrors, isPath, useExtensionBonus)


  match: (string, query, prepQuery, {allowErrors}={}) ->
    return [] unless string
    return [] unless query
    return [0...string.length] if string is query

    # if prepQuery is given -> use it, else if prepQueryCache match the same query -> use cache, else -> compute & cache
    prepQuery ?= if prepQueryCache and prepQueryCache.query is query then prepQueryCache else (prepQueryCache = scorer.prepQuery(query))

    return [] unless allowErrors or scorer.isMatch(string, prepQuery.core_lw, prepQuery.core_up)
    string_lw = string.toLowerCase()

    # Full path results
    matches = matcher.match(string, string_lw, prepQuery)

    #if there is no matches on the full path, there should not be any on the base path either.
    return matches if matches.length is 0

    # Is there a base path ?
    if(string.indexOf(PathSeparator) > -1)

      # Base path results
      baseMatches = matcher.basenameMatch(string, string_lw, prepQuery)

      # Combine the results, removing duplicate indexes
      matches = matcher.mergeMatches(matches, baseMatches)

    matches


