#
# Query object
#
# Allow to reuse some quantities computed from query.
# Optional char can optionally be specified in the form of a regular expression.
#

{countDir, getExtension} = require "./pathScorer"

module.exports =
  class Query
    constructor: (query, {optCharRegEx, pathSeparator} = {} ) ->
      return null unless query and query.length

      @query = query
      @query_lw = query.toLowerCase()
      @core = coreChars(query, optCharRegEx)
      @core_lw = @core.toLowerCase()
      @core_up = truncatedUpperCase(@core)
      @depth = countDir(query, query.length, pathSeparator )
      @ext = getExtension(@query_lw)


#
# Optional chars
# Those char improve the score if present, but will not block the match (score=0) if absent.

opt_char_re = /[ _\-:\/\\]/g

coreChars = (query, optCharRegEx = opt_char_re) ->
  return query.replace(optCharRegEx, '')

#
# Truncated Upper Case:
# --------------------
#
# A fundamental mechanic is that we are able to keep uppercase and lowercase variant of the strings in sync.
# For that we assume uppercase and lowercase version of the string have the same length. Of course unicode being unicode there's exceptions.
# See ftp://ftp.unicode.org/Public/UCD/latest/ucd/SpecialCasing.txt for the list
#
# "Straße".toUpperCase() -> "STRASSE"
# truncatedUpperCase("Straße") -> "STRASE"
# iterating over every character, getting uppercase variant and getting first char of that.
#

truncatedUpperCase = (str) ->
  upper = ""
  upper += char.toUpperCase()[0] for char in str
  return upper