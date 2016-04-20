scorer = require './scorer'
filter = require './filter'
matcher = require './matcher'

preparedQueryCache = null
defaultPathSeparator = if process and (process.platform is "win32") then '\\' else '/'


module.exports =

  filter: (candidates, query, options = {}) ->
    return [] unless query?.length and candidates?.length
    options = parseOptions(options)
    filter(candidates, query, options)

  prepareQuery: (query, options = {}) ->
    options = parseOptions(options)
    scorer.prepareQuery(query, options)

  score: (string, query, options = {}) ->
    return 0 unless string?.length and query?.length

    options = parseOptions(options)
    {allowErrors, isPath, useExtensionBonus, optCharRegEx, pathSeparator, preparedQuery} = options

    # if prepQuery is given -> use it, else if prepQueryCache match the same query -> use cache, else -> compute & cache
    preparedQuery ?= if preparedQueryCache and preparedQueryCache.query is query then preparedQueryCache else
      (preparedQueryCache = scorer.prepareQuery(query, options))

    return scorer.score(string, query, preparedQuery, allowErrors, isPath, useExtensionBonus, pathSeparator)


  match: (string, query, options = {}) ->
    return [] unless string
    return [] unless query
    return [0...string.length] if string is query

    options = parseOptions(options)
    {allowErrors, isPath, useExtensionBonus, optCharRegEx, pathSeparator, preparedQuery} = options

    # if prepQuery is given -> use it, else if prepQueryCache match the same query -> use cache, else -> compute & cache
    preparedQuery ?= if preparedQueryCache and preparedQueryCache.query is query then preparedQueryCache else
      (preparedQueryCache = scorer.prepareQuery(query, options))

    return [] unless allowErrors or scorer.isMatch(string, preparedQuery.core_lw, preparedQuery.core_up)
    string_lw = string.toLowerCase()

    # Full path results
    matches = matcher.match(string, string_lw, preparedQuery)

    #if there is no matches on the full path, there should not be any on the base path either.
    return matches if matches.length is 0

    # Is there a base path ?
    if(string.indexOf(pathSeparator) > -1)

      # Base path results
      baseMatches = matcher.basenameMatch(string, string_lw, preparedQuery, pathSeparator)

      # Combine the results, removing duplicate indexes
      matches = matcher.mergeMatches(matches, baseMatches)

    matches


  wrap: (string, query, options = {}) ->

    tagClass = options.tagClass || 'highlight'
    tagOpen = options.tagOpen || '<strong class="' + tagClass + '">'
    tagClose = options.tagClose || '</strong>'

    #Run get position where a match is found
    matchPositions = this.match(string, query, options)

    #If no match return as is
    if !matchPositions or matchPositions.length == 0
      return string

    #Loop over match positions
    output = ''
    matchIndex = -1
    strPos = 0
    while ++matchIndex < matchPositions.length
      matchPos = matchPositions[matchIndex]

      # Get text before the current match position
      if matchPos > strPos
        output += string.substring(strPos, matchPos)
        strPos = matchPos

      # Get consecutive matches to wrap under a single tag
      while ++matchIndex < matchPositions.length
        if matchPositions[matchIndex] == matchPos + 1
          matchPos++
        else
          matchIndex--
          break

      #Get text inside the match, including current character
      matchPos++
      if matchPos > strPos
        output += tagOpen
        output += string.substring(strPos, matchPos)
        output += tagClose
        strPos = matchPos

    #Get string after last match
    if(strPos < string.length - 1)
      output += string.substring(strPos)

    #return wrapped text
    output


#Setup default values
parseOptions = (options) ->

  options.allowErrors ?= false
  options.isPath ?= true
  options.useExtensionBonus ?= false
  options.pathSeparator ?= defaultPathSeparator
  options.optCharRegEx ?= null
  options.preparedQuery ?= null

  options






