scorer = require './scorer'
filter = require './filter'
matcher = require './matcher'

prepQueryCache = null

module.exports =

  filter: (candidates, query, options = {}) ->
    return [] unless query?.length and candidates?.length
    options = parseOptions(options)
    filter(candidates, query, options)

  prepQuery: (query, options = {}) ->
    options = parseOptions(options)
    scorer.prepQuery(query, options)

  score: (string, query, prepQuery, options = {}) ->
    return 0 unless string?.length and query?.length

    options = parseOptions(options)
    {allowErrors, isPath, useExtensionBonus, optCharRegEx, pathSeparator} = options

    # if prepQuery is given -> use it, else if prepQueryCache match the same query -> use cache, else -> compute & cache
    prepQuery ?= if prepQueryCache and prepQueryCache.query is query then prepQueryCache else (prepQueryCache = scorer.prepQuery(query, options))

    return scorer.score(string, query, prepQuery, allowErrors, isPath, useExtensionBonus, pathSeparator)


  match: (string, query, prepQuery, options = {}) ->
    return [] unless string
    return [] unless query
    return [0...string.length] if string is query

    options = parseOptions(options)
    {allowErrors, isPath, useExtensionBonus, optCharRegEx, pathSeparator} = options

    # if prepQuery is given -> use it, else if prepQueryCache match the same query -> use cache, else -> compute & cache
    prepQuery ?= if prepQueryCache and prepQueryCache.query is query then prepQueryCache else (prepQueryCache = scorer.prepQuery(query, options))

    return [] unless allowErrors or scorer.isMatch(string, prepQuery.core_lw, prepQuery.core_up)
    string_lw = string.toLowerCase()

    # Full path results
    matches = matcher.match(string, string_lw, prepQuery)

    #if there is no matches on the full path, there should not be any on the base path either.
    return matches if matches.length is 0

    # Is there a base path ?
    if(string.indexOf(pathSeparator) > -1)

      # Base path results
      baseMatches = matcher.basenameMatch(string, string_lw, prepQuery, pathSeparator)

      # Combine the results, removing duplicate indexes
      matches = matcher.mergeMatches(matches, baseMatches)

    matches


parseOptions = (options) ->

  options.allowErrors ?= false
  options.isPath ?= true
  options.useExtensionBonus ?= true
  options.pathSeparator ?= scorer.pathSeparator
  options.optCharRegEx ?= null

  options






