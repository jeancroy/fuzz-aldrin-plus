filter = require './filter'
matcher = require './matcher'
scorer = require './scorer'
pathScorer = require './pathScorer'
Query = require './query'

preparedQueryCache = null
defaultPathSeparator = if process?.platform is "win32" then '\\' else '/'

module.exports =

  filter: (candidates, query, options = {}) ->
    return [] unless query?.length and candidates?.length
    options = parseOptions(options, query)
    filter(candidates, query, options)

  score: (string, query, options = {}) ->
    return 0 unless string?.length and query?.length
    options = parseOptions(options, query)
    if options.usePathScoring
      return pathScorer.score(string, query, options)
    else return scorer.score(string, query, options)

  match: (string, query, options = {}) ->
    return [] unless string
    return [] unless query
    return [0...string.length] if string is query
    options = parseOptions(options, query)
    return matcher.match(string, query, options)

  wrap: (string, query, options = {}) ->
    return [] unless string
    return [] unless query
    options = parseOptions(options, query)
    return matcher.wrap(string, query, options)

  prepareQuery: (query, options = {}) ->
    options = parseOptions(options, query)
    return options.preparedQuery

#Setup default values
parseOptions = (options, query) ->

  options.allowErrors ?= false
  options.usePathScoring ?= true
  options.useExtensionBonus ?= false
  options.pathSeparator ?= defaultPathSeparator
  options.optCharRegEx ?= null
  options.wrap ?= null

  options.preparedQuery ?=
    if preparedQueryCache and preparedQueryCache.query is query
    then preparedQueryCache
    else (preparedQueryCache = new Query(query, options))

  return options






