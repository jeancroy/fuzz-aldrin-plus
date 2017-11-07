#
# Score similarity between two string
#
#  isMatch: Fast detection if all character of needle is in haystack
#  score: Find string similarity using a Smith Waterman algorithm
#         Modified to account for programing scenarios (CamelCase folder/file.ext object.property)
#
# Copyright (C) 2015 Jean Christophe Roy and contributors
# MIT License: http://opensource.org/licenses/MIT


# Base point for a single character match
# This balance making patterns VS position and size penalty.
wm = 150

#Fading function
pos_bonus = 20 # The character from 0..pos_bonus receive a greater bonus for being at the start of string.
tau_size = 150 # Full path length at which the whole match score is halved.

# Miss count
# When subject[i] is query[j] we register a hit.
# Limiting hit put a boundary on how many permutation we consider to find the best one.
# Helps to speed-up processing of long path and query containing frequent character (eg vowels)
#
# If a spec with frequent repetition fail, increase this.
# This has a direct influence on worst case scenario benchmark.
miss_coeff = 0.75 #Max number missed consecutive hit = ceil(miss_coeff*query.length) + 5


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
  return Math.ceil(score)


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

    qj_lw = query_lw.charCodeAt j
    qj_up = query_up.charCodeAt j

    # continue walking the subject from where we have left with previous query char
    # until we have found a character that is either lowercase or uppercase query.
    while ++i < m
      si = subject.charCodeAt i
      break if si is qj_lw or si is qj_up

    # if we passed the last char, query is not in subject
    if i is m then return false

  #Found every char of query in subject in proper order, match is positive
  return true


#----------------------------------------------------------------------
#
# Main scoring algorithm
#

exports.computeScore = computeScore = (subject, subject_lw, preparedQuery) ->
  query = preparedQuery.query
  query_lw = preparedQuery.query_lw

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


  # Init
  score_row = new Array(n)
  csc_row = new Array(n)
  sz = scoreSize(n, m)

  miss_budget = Math.ceil(miss_coeff * n) + 5
  miss_left = miss_budget
  csc_should_rebuild = true

  # Fill with 0
  j = -1
  while ++j < n
    score_row[j] = 0
    csc_row[j] = 0

  i = -1
  while ++i < m     #foreach char si of subject
    si_lw = subject_lw[i]

    # if si_lw is not in query
    if not si_lw.charCodeAt(0) of preparedQuery.charCodes
      # reset csc_row and move to next subject char
      # unless we just cleaned it then keep cleaned version.
      if csc_should_rebuild
        j = -1
        while ++j < n
          csc_row[j] = 0
        csc_should_rebuild = false
      continue

    score = 0
    score_diag = 0
    csc_diag = 0
    record_miss = true
    csc_should_rebuild = true

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
          if(record_miss and --miss_left <= 0) then return Math.max(score, score_row[n - 1]) * sz

          record_miss = false


      #Prepare next sequence & match score.
      score_diag = score_up
      csc_diag = csc_row[j]
      csc_row[j] = csc_score
      score_row[j] = score

  # get hightest score so far
  score = score_row[n - 1]
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

exports.scoreSize = scoreSize = (n, m) ->
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

exports.scoreConsecutives = scoreConsecutives = (subject, subject_lw, query, query_lw, i, j, startOfWord) ->
  m = subject.length
  n = query.length

  mi = m - i
  nj = n - j
  k = if mi < nj then mi else nj

  sameCase = 0
  sz = 0 #sz will be one more than the last qi is sj

  # query_lw[i] is subject_lw[j] has been checked before entering now do case sensitive check.
  sameCase++ if (query[j] is subject[i])

  #Continue while lowercase char are the same, record when they are case-sensitive match.
  while (++sz < k and query_lw[++j] is subject_lw[++i])
    sameCase++ if (query[j] is subject[i])


  # If we quit because of a non match
  # replace cursor to the last match
  if sz < k then i--

  # Faster path for single match.
  # Isolated character match occurs often and are not really interesting.
  # Fast path so we don't compute expensive pattern score on them.
  # Acronym should be addressed with acronym context bonus instead of consecutive.
  return 1 + 2 * sameCase if sz is 1

  return scorePattern(sz, n, sameCase, startOfWord, isWordEnd(i, subject, subject_lw, m))


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
  sumPos = 0
  sameCase = 0

  i = -1
  j = -1

  #foreach char of query
  while ++j < n

    qj_lw = query_lw[j]

    # Separator will not score point but will continue the prefix when present.
    # Test that the separator is in the candidate and advance cursor to that position.
    # If no separator break the prefix

    if isSeparator(qj_lw)
      i = subject_lw.indexOf(qj_lw, i + 1)
      if i > -1
        sepCount++
        continue
      else
        break

    # For other characters we search for the first match where subject[i] = query[j]
    # that also happens to be a start-of-word

    while ++i < m
      if qj_lw is subject_lw[i] and isWordStart(i, subject, subject_lw)
        sameCase++ if ( query[j] is subject[i] )
        sumPos += i
        count++
        break

    # All of subject is consumed, stop processing the query.
    if i is m then break


  # Here, all of query is consumed (or we have reached a character not in acronym)
  # A single character is not an acronym (also prevent division by 0)
  if(count < 2)
    return emptyAcronymResult

  # Acronym are scored as start-of-word
  # Unless the acronym is a 1:1 match with candidate then it is upgraded to full-word.
  fullWord = if count is n then isAcronymFullWord(subject, subject_lw, query, count) else false
  score = scorePattern(count, n, sameCase, true, fullWord)

  return new AcronymResult(score, sumPos / count, count + sepCount)


#
# Test whether there's a 1:1 relationship between query and acronym of candidate.
# For that to happens
# (a) All character of query must be matched to an acronym of candidate
# (b) All acronym of candidate must be matched to a character of query.
#
# This method check for (b) assuming (a) has been checked before entering.

isAcronymFullWord = (subject, subject_lw, query, nbAcronymInQuery) ->
  m = subject.length
  n = query.length
  count = 0

  # Heuristic:
  # Assume one acronym every (at most) 12 character on average
  # This filter out long paths, but then they can match on the filename.
  if (m > 12 * n) then return false

  i = -1
  while ++i < m
    #For each char of subject
    #Test if we have an acronym, if so increase acronym count.
    #If the acronym count is more than nbAcronymInQuery (number of non separator char in query)
    #Then we do not have 1:1 relationship.
    if isWordStart(i, subject, subject_lw) and ++count > nbAcronymInQuery then return false

  return true