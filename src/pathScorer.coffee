{isMatch, computeScore, scoreSize} = require './scorer'


tau_depth = 13 # Directory depth at which the full path influence is halved.
file_coeff = 1.5 # Full path is also penalized for length of basename. This adjust a scale factor for that penalty.

#
# Main export
#
# Manage the logic of testing if there's a match and calling the main scoring function
# Also manage scoring a path and optional character.

exports.score = (string, query, options) ->
  {preparedQuery, allowErrors} = options
  return 0 unless allowErrors or isMatch(string, preparedQuery.core_lw, preparedQuery.core_up)
  string_lw = string.toLowerCase()
  score = computeScore(string, string_lw, preparedQuery)
  score = scorePath(string, string_lw, score, options)
  return Math.ceil(score)


#
# Score adjustment for path
#

scorePath = (subject, subject_lw, fullPathScore, options) ->
  return 0 if fullPathScore is 0

  {preparedQuery, useExtensionBonus, pathSeparator} = options

  # Skip trailing slashes
  end = subject.length - 1
  while subject[end] is pathSeparator then end--

  # Get position of basePath of subject.
  basePos = subject.lastIndexOf(pathSeparator, end)
  fileLength = end-basePos

  # Get a bonus for matching extension
  extAdjust = 1.0

  if useExtensionBonus
    extAdjust += getExtensionScore(subject_lw, preparedQuery.ext, basePos, end, 2)
    fullPathScore *= extAdjust

  # no basePath, nothing else to compute.
  return fullPathScore if (basePos is -1)

  # Get the number of folder in query
  depth = preparedQuery.depth

  # Get that many folder from subject
  while basePos > -1 and depth-- > 0
    basePos = subject.lastIndexOf(pathSeparator, basePos - 1)

  # Get basePath score, if BaseName is the whole string, no need to recompute
  # We still need to apply the folder depth and filename penalty.
  basePathScore = if (basePos is -1) then fullPathScore else
    extAdjust * computeScore(subject.slice(basePos + 1, end + 1), subject_lw.slice(basePos + 1, end + 1), preparedQuery)

  # Final score is linear interpolation between base score and full path score.
  # For low directory depth, interpolation favor base Path then include more of full path as depth increase
  #
  # A penalty based on the size of the basePath is applied to fullPathScore
  # That way, more focused basePath match can overcome longer directory path.

  alpha = 0.5 * tau_depth / ( tau_depth + countDir(subject, end + 1, pathSeparator) )
  return  alpha * basePathScore + (1 - alpha) * fullPathScore * scoreSize(0, file_coeff * (fileLength))


#
# Count number of folder in a path.
# (consecutive slashes count as a single directory)
#

exports.countDir = countDir = (path, end, pathSeparator) ->
  return 0 if end < 1

  count = 0
  i = -1

  #skip slash at the start so `foo/bar` and `/foo/bar` have the same depth.
  while ++i < end and path[i] is pathSeparator
    continue

  while ++i < end
    if (path[i] is pathSeparator)
      count++ #record first slash, but then skip consecutive ones
      while ++i < end and path[i] is pathSeparator
        continue

  return count

#
# Find fraction of extension that is matched by query.
# For example mf.h prefers myFile.h to myfile.html
# This need special handling because it give point for not having characters (the `tml` in above example)
#

exports.getExtension = getExtension = (str) ->
  pos = str.lastIndexOf(".")
  if pos < 0 then ""  else  str.substr(pos + 1)


getExtensionScore = (candidate, ext, startPos, endPos, maxDepth) ->
  # startPos is the position of last slash of candidate, -1 if absent.

  return 0 unless ext.length

  # Check that (a) extension exist, (b) it is after the start of the basename
  pos = candidate.lastIndexOf(".", endPos)
  return 0 unless pos > startPos # (note that startPos >= -1)

  n = ext.length
  m = endPos - pos

  # n contain the smallest of both extension length, m the largest.
  if( m < n)
    n = m
    m = ext.length

  #place cursor after dot & count number of matching characters in extension
  pos++
  matched = -1
  while ++matched < n then break if candidate[pos + matched] isnt ext[matched]

  # if nothing found, try deeper for multiple extensions, with some penalty for depth
  if matched is 0 and maxDepth > 0
    return 0.9 * getExtensionScore(candidate, ext, startPos, pos - 2, maxDepth - 1)

  # cannot divide by zero because m is the largest extension length and we return if either is 0
  return  matched / m
