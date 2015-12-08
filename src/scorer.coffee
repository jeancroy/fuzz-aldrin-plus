#
# Score similarity between two string
#
#  isMatch: Fast detection if all character of needle is in haystack
#  score: Find string similarity using a Smith Waterman algorithm
#         Modified to account for programing scenarios (CamelCase folder/file.ext object.property)
#
# Copyright (C) 2015 Jean Christophe Roy and contributors
# MIT License: http://opensource.org/licenses/MIT

PathSeparator = require('path').sep

# Base point for a single character match
# This balance making patterns VS position and size penalty.
wm = 150

#Fading function
pos_bonus = 20 # The character from 0..pos_bonus receive a greater bonus for being at the start of string.
tau_depth = 13 # Directory depth at which the full path influence is halved.
tau_size = 85 # Full path length at which the whole match score is halved.
file_coeff = 1.2 # Full path is also penalized for length of basename. This adjust a scale factor for that penalty.

# Miss count
# When subject[i] is query[j] we register a hit.
# Limiting hit put a boundary on how many permutation we consider to find the best one.
# Helps to speed-up processing of long path and query containing frequent character (eg vowels)
#
# If a spec with frequent repetition fail, increase this.
# This has a direct influence on worst case scenario benchmark.
miss_coeff = 0.75 #Max number missed consecutive hit = ceil(miss_coeff*query.length) + 5

#
# Optional chars
# Those char improve the score if present, but will not block the match (score=0) if absent.

opt_char_re = /[ _\-:\/\\]/g

exports.coreChars = coreChars = (query, optCharRegEx = opt_char_re) ->
  return query.replace(optCharRegEx, '')

#
# Main export
#
# Manage the logic of testing if there's a match and calling the main scoring function
# Also manage scoring a path and optional character.

exports.score = (string, query, prepQuery, allowErrors, isPath) ->
  return 0 unless allowErrors or isMatch(string, prepQuery.core_lw, prepQuery.core_up)
  string_lw = string.toLowerCase()
  score = doScore(string, string_lw, prepQuery)
  if isPath then score = pathScore(string, string_lw, prepQuery, score)
  return Math.ceil(score)


#
# Query object
#
# Allow to reuse some quantities computed from query.
# Optional char can optionally be specified in the form of a regular expression.
#

class Query
  constructor: (query, optCharRegEx) ->
    return null unless query and query.length

    @query = query
    @query_lw = query.toLowerCase()
    @core = coreChars(query, optCharRegEx)
    @core_lw = @core.toLowerCase()
    @core_up = truncatedUpperCase(@core)
    @depth = countDir(query, query.length)
    @ext = getExtension(@query_lw)


exports.prepQuery = (query) ->
  return new Query(query)


#
# isMatch:
# Are all (non optional)characters of query in subject, in proper order ?
#

exports.isMatch = isMatch = (subject, query_lw, query_up) ->
  m = subject.length
  n = query_lw.length

  if !m or n > m
    return false

  i = -1
  j = -1

  #foreach char of query
  while ++j < n

    qj_lw = query_lw[j]
    qj_up = query_up[j]

    # continue walking the subject from where we have left with previous query char
    # until we have found a character that is either lowercase or uppercase query.
    while ++i < m
      si = subject[i]
      break if si is qj_lw or si is qj_up

    # if we passed the last char, query is not in subject
    if i is m then return false

  #Found every char of query in subject in proper order, match is positive
  return true


#----------------------------------------------------------------------
#
# Main scoring algorithm
#

doScore = (subject, subject_lw, prepQuery) ->
  query = prepQuery.query
  query_lw = prepQuery.query_lw

  m = subject.length
  n = query.length


  #----------------------------
  # Abbreviations sequence

  acro = scoreAcronyms(subject, subject_lw, query, query_lw)
  acro_score = acro.score

  # Whole query is abbreviation ?
  # => use that as score
  if( acro.count is n)
    return scoreExact(n, m, acro_score, acro.pos)

  #----------------------------
  # Exact Match ?
  # => use that as score

  pos = subject_lw.indexOf(query_lw)
  if pos > -1
    return scoreExactMatch(subject, subject_lw, query, query_lw, pos, n, m)


  #----------------------------
  # Individual characters
  # (Smith Waterman algorithm)


  #Init
  score_row = new Array(n)
  csc_row = new Array(n)
  sz = scoreSize(n, m)

  miss_budget = Math.ceil(miss_coeff * n) + 5
  miss_left = miss_budget

  #Fill with 0
  j = -1
  while ++j < n
    score_row[j] = 0
    csc_row[j] = 0


  # Limit the search to the active region
  # for example with query `abc`, subject `____a_bc_ac_c____`
  # there's a region before first `a` and after last `c`
  # that can be simplified out of the matching process

  # Before first occurrence in subject of first letter of query, or -1
  i = subject_lw.indexOf(query_lw[0])
  if(i > -1) then i--

  # After last occurrence of last letter of query,
  mm = subject_lw.lastIndexOf(query_lw[n - 1], m)
  if(mm > i) then m = mm + 1

  while ++i < m     #foreach char si of subject

    score = 0
    score_diag = 0
    csc_diag = 0
    si_lw = subject_lw[i]
    record_miss = true

    j = -1 #0..n-1
    while ++j < n   #foreach char qj of query

      # What is the best gap ?
      # score_up contain the score of a gap in subject.
      # score_left = last iteration of score, -> gap in query.
      score_up = score_row[j]
      score = score_up if(score_up > score )

      #Reset consecutive
      csc_score = 0

      #Compute a tentative match
      if ( query_lw[j] is si_lw )

        start = isWordStart(i, subject, subject_lw)

        # Forward search for a sequence of consecutive char
        csc_score = if csc_diag > 0  then csc_diag else
          scoreConsecutives(subject, subject_lw, query, query_lw, i, j, start)

        # Determine bonus for matching A[i] with B[j]
        align = score_diag + scoreCharacter(i, j, start, acro_score, csc_score)

        #Are we better using this match or taking the best gap (currently stored in score)?
        if(align > score)
          score = align
          # reset consecutive missed hit count
          miss_left = miss_budget
        else
          # We rejected this match and record a miss.
          # If budget is exhausted exit
          # Each character of query have it's score history stored in score_row
          # To get full query score use last item of row.
          return score_row[n - 1] * sz if(record_miss and --miss_left <= 0)
          record_miss = false


      #Prepare next sequence & match score.
      score_diag = score_up
      csc_diag = csc_row[j]
      csc_row[j] = csc_score
      score_row[j] = score


  return score * sz

#
# Boundaries
#
# Is the character at the start of a word, end of the word, or a separator ?
# Fortunately those small function inline well.
#

exports.isWordStart = isWordStart = (pos, subject, subject_lw) ->
  return true if pos is 0 # match is FIRST char ( place a virtual token separator before first char of string)
  curr_s = subject[pos]
  prev_s = subject[pos - 1]
  return isSeparator(prev_s) or # match FOLLOW a separator
      (  curr_s isnt subject_lw[pos] and prev_s is subject_lw[pos - 1] ) # match is Capital in camelCase (preceded by lowercase)


exports.isWordEnd = isWordEnd = (pos, subject, subject_lw, len) ->
  return true if  pos is len - 1 # last char of string
  curr_s = subject[pos]
  next_s = subject[pos + 1]
  return isSeparator(next_s) or # match IS FOLLOWED BY a separator
      ( curr_s is subject_lw[pos] and next_s isnt subject_lw[pos + 1] ) # match is lowercase, followed by uppercase


isSeparator = (c) ->
  return c is ' ' or c is '.' or c is '-' or c is '_' or c is '/' or c is '\\'

#
# Scoring helper
#

scorePosition = (pos) ->
  if pos < pos_bonus
    sc = pos_bonus - pos
    return 100 + sc * sc
  else
    return Math.max(100 + pos_bonus - pos, 0)

scoreSize = (n, m) ->
  # Size penalty, use the difference of size (m-n)
  return tau_size / ( tau_size + Math.abs(m - n))

scoreExact = (n, m, quality, pos) ->
  return 2 * n * ( wm * quality + scorePosition(pos) ) * scoreSize(n, m)


#
# Shared scoring logic between exact match, consecutive & acronym
# Ensure pattern length dominate the score then refine to take into account case-sensitivity
# and structural quality of the pattern on the overall string (word boundary)
#

exports.scorePattern = scorePattern = (count, len, sameCase, start, end) ->
  sz = count

  bonus = 6 # to ensure consecutive length dominate score, this should be as large other bonus combined
  bonus += 2 if sameCase is count
  bonus += 3 if start
  bonus += 1 if end

  if count is len
    # when we match 100% of query we allow to break the size ordering.
    # This is to help exact match bubble up vs size, depth penalty etc
    if start
      if sameCase is len
        sz += 2
      else
        sz += 1
    if end
      bonus += 1

  return sameCase + sz * ( sz + bonus )


#
# Compute the bonuses for two chars that are confirmed to matches in a case-insensitive way
#

exports.scoreCharacter = scoreCharacter = (i, j, start, acro_score, csc_score) ->

  # start of string / position of match bonus
  posBonus = scorePosition(i)

  # match IS a word boundary
  # choose between taking part of consecutive characters or consecutive acronym
  if start
    return posBonus + wm * ( (if acro_score > csc_score then acro_score else csc_score) + 10  )

  # normal Match
  return posBonus + wm * csc_score


#
# Forward search for a sequence of consecutive character.
#

exports.scoreConsecutives = scoreConsecutives = (subject, subject_lw, query, query_lw, i, j, start) ->
  m = subject.length
  n = query.length

  mi = m - i
  nj = n - j
  k = if mi < nj then mi else nj

  startPos = i #record start position
  sameCase = 0
  sz = 0 #sz will be one more than the last qi is sj

  # query_lw[i] is subject_lw[j] has been checked before entering now do case sensitive check.
  sameCase++ if (query[j] is subject[i])

  #Continue while lowercase char are the same, record when they are case-sensitive match.
  while (++sz < k and query_lw[++j] is subject_lw[++i])
    sameCase++ if (query[j] is subject[i])

  # Faster path for single match.
  # Isolated character match occurs often and are not really interesting.
  # Fast path so we don't compute expensive pattern score on them.
  # Acronym should be addressed with acronym context bonus instead of consecutive.
  return 1 + 2 * sameCase if sz is 1

  return scorePattern(sz, n, sameCase, start, isWordEnd(i, subject, subject_lw, m))


#
# Compute the score of an exact match at position pos.
#

exports.scoreExactMatch = scoreExactMatch = (subject, subject_lw, query, query_lw, pos, n, m) ->

  # Test for word start
  start = isWordStart(pos, subject, subject_lw)

  # Heuristic
  # If not a word start, test next occurrence
  # - We want exact match to be fast
  # - For exact match, word start has the biggest impact on score.
  # - Testing 2 instances is somewhere between testing only one and testing every instances.

  if not start
    pos2 = subject_lw.indexOf(query_lw, pos + 1)
    if pos2 > -1
      start = isWordStart(pos2, subject, subject_lw)
      pos = pos2 if start

  #Exact case bonus.
  i = -1
  sameCase = 0
  while (++i < n)
    if (query[pos + i] is subject[i])
      sameCase++

  end = isWordEnd(pos + n - 1, subject, subject_lw, m)

  return scoreExact(n, m, scorePattern(n, n, sameCase, start, end), pos)


#
# Acronym prefix
#

class AcronymResult
  constructor: (@score, @pos, @count) ->

emptyAcronymResult = new AcronymResult(0, 0.1, 0)

exports.scoreAcronyms = scoreAcronyms = (subject, subject_lw, query, query_lw) ->
  m = subject.length
  n = query.length

  #a single char is not an acronym
  return emptyAcronymResult unless m > 1 and n > 1

  count = 0
  sepCount = 0
  pos = 0
  sameCase = 0

  i = -1
  j = -1

  #foreach char of query
  while ++j < n

    qj_lw = query_lw[j]

    # Separator get no acronym points, but will not break the acronym prefix sequence either.
    # Only need to test once per character.
    if isSeparator(qj_lw)
      i = subject_lw.indexOf(qj_lw, i + 1)
      if i > -1
        sepCount++
        continue
      else
        break


    while ++i < m

      #test if subject match
      # Only record match that are also start-of-word.
      if qj_lw is subject_lw[i]

        if isWordStart(i, subject, subject_lw)
          sameCase++ if ( query[j] is subject[i] )
          pos += i
          count++
          break

    #all of subject is consumed, stop processing the query.
    if i is m then break

  #all of query is consumed.
  #a single char is not an acronym (also prevent division by 0)
  if(count < 2)
    return emptyAcronymResult

  #Acronym are scored as start of word, but not full word
  score = scorePattern(count, n, sameCase, true, false) # wordStart = true, wordEnd = false

  return new AcronymResult(score, pos / count, count + sepCount)


#----------------------------------------------------------------------

#
# Score adjustment for path
#

pathScore = (subject, subject_lw, prepQuery, fullPathScore) ->
  return 0 if fullPathScore is 0


  # Skip trailing slashes
  end = subject.length - 1
  end-- while subject[end] is PathSeparator

  # Get position of basePath of subject.
  basePos = subject.lastIndexOf(PathSeparator, end)

  # Get a bonus for matching extension
  extAdjust = 1.0 + getExtensionScore(subject_lw, prepQuery.ext)
  fullPathScore *= extAdjust

  # Get the number of folder in query
  depth = prepQuery.depth

  # Get that many folder from subject
  while(depth-- > 0)
    basePos = subject.lastIndexOf(PathSeparator, basePos - 1)
    if (basePos is -1) then return fullPathScore #consumed whole subject ?

  # Get basePath score
  basePos++
  end++
  basePathScore = doScore(subject[basePos...end], subject_lw[basePos...end], prepQuery)
  basePathScore *= extAdjust

  # Final score is linear interpolation between base score and full path score.
  # For low directory depth, interpolation favor base Path then include more of full path as depth increase
  #
  # A penalty based on the size of the basePath is applied to fullPathScore
  # That way, more focused basePath match can overcome longer directory path.

  alpha = 0.5 * tau_depth / ( tau_depth + countDir(subject, end + 1) )
  return  alpha * basePathScore + (1 - alpha) * fullPathScore * scoreSize(0, file_coeff * (end - basePos))


#
# Count number of folder in a path.
# (consecutive slashes count as a single directory)
#

exports.countDir = countDir = (path, end) ->
  return 0 if end < 1

  count = 0
  i = -1

  #skip slash at the start so `foo/bar` and `/foo/bar` have the same depth.
  while ++i < end and path[i] is PathSeparator
    continue

  while ++i < end
    if (path[i] is PathSeparator)
      count++ #record first slash, but then skip consecutive ones
      while ++i < end and path[i] is PathSeparator
        continue

  return count

#
# Find fraction of extension that is matched by query.
# For example mf.h prefers myFile.h to myfile.html
# This need special handling because it give point for not having characters (the `tml` in above example)
#

getExtension = (str) ->
  pos = str.lastIndexOf(".")
  if pos < 0 then ""  else  str.substr(pos + 1)


getExtensionScore = (candidate, ext) ->
  return 0 unless ext.length
  pos = candidate.lastIndexOf(".") + 1
  return 0 unless pos > 1

  n = ext.length
  m = candidate.length - pos

  #n contain the smallest of both extension length, m the largest.
  if( m < n)
    n = m
    m = ext.length

  #count number of matching characters in extension
  matched = -1
  while ++matched < n then break unless candidate[pos + matched] is ext[matched]

  #cannot divide by zero because m is the largest and we return if either is 0
  return  matched / m

#
# Truncated Upper Case:
# --------------------
#
# A fundamental mechanic is that we are able to keep uppercase and lowercase variant of the strings in sync.
# For that we assume uppercase and lowercase version of the string have the same length
#
# Of course unicode being unicode there's exceptions.
# See ftp://ftp.unicode.org/Public/UCD/latest/ucd/SpecialCasing.txt for the list
#
# One common example is 'LATIN SMALL LETTER SHARP S' (U+00DF)
# "Straße".toUpperCase() === "STRASSE" // length goes from 6 char to 7 char
#
# Fortunately only uppercase is touched by the exceptions.
#
# truncatedUpperCase("Straße") returns "STRASE"
# iterating over every character, getting uppercase variant and getting first char of that.
#
# This works for isMatch because we require candidate to contain at least this string.
# Aka second S of STRASSE is still valid, simply an optional character.

truncatedUpperCase = (str) ->
  upper = ""
  upper += char.toUpperCase()[0] for char in str
  return upper