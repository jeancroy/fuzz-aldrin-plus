# A match list is an array of indexes to characters that match.
# This file should closely follow `scorer` except that it returns an array
# of indexes instead of a score.

{isMatch, isWordStart, scoreConsecutives, scoreCharacter, scoreAcronyms} = require './scorer'

#
# Main export
#
# Return position of character which matches

exports.match = match = (string, query, options) ->

  {allowErrors, preparedQuery, pathSeparator} = options

  return [] unless allowErrors or isMatch(string, preparedQuery.core_lw, preparedQuery.core_up)
  string_lw = string.toLowerCase()

  # Full path results
  matches = computeMatch(string, string_lw, preparedQuery)

  #if there is no matches on the full path, there should not be any on the base path either.
  return matches if matches.length is 0

  # Is there a base path ?
  if(string.indexOf(pathSeparator) > -1)

    # Base path results
    baseMatches = basenameMatch(string, string_lw, preparedQuery, pathSeparator)

    # Combine the results, removing duplicate indexes
    matches = mergeMatches(matches, baseMatches)

  matches


#
# Wrap
#
# Helper around match if you want a string with result wrapped by some delimiter text

exports.wrap = (string, query, options) ->

  if(options.wrap?)
    {tagClass, tagOpen, tagClose} = options.wrap

  tagClass ?= 'highlight'
  tagOpen ?= '<strong class="' + tagClass + '">'
  tagClose ?= '</strong>'

  if string == query
    return tagOpen + string + tagClose

  #Run get position where a match is found
  matchPositions = match(string, query, options)

  #If no match return as is
  if matchPositions.length == 0
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
  if(strPos <= string.length - 1)
    output += string.substring(strPos)

  #return wrapped text
  output



basenameMatch = (subject, subject_lw, preparedQuery, pathSeparator) ->

  # Skip trailing slashes
  end = subject.length - 1
  end-- while subject[end] is pathSeparator

  # Get position of basePath of subject.
  basePos = subject.lastIndexOf(pathSeparator, end)

  #If no PathSeparator, no base path exist.
  return [] if (basePos is -1)

  # Get the number of folder in query
  depth = preparedQuery.depth

  # Get that many folder from subject
  while(depth-- > 0)
    basePos = subject.lastIndexOf(pathSeparator, basePos - 1)
    return [] if (basePos is -1) #consumed whole subject ?

  # Get basePath match
  basePos++
  end++
  computeMatch(subject[basePos ... end], subject_lw[basePos... end], preparedQuery, basePos)


#
# Combine two matches result and remove duplicate
# (Assume sequences are sorted, matches are sorted by construction.)
#

mergeMatches = (a, b) ->
  m = a.length
  n = b.length

  return a.slice() if n is 0
  return b.slice() if m is 0

  i = -1
  j = 0
  bj = b[j]
  out = []

  while ++i < m
    ai = a[i]

    while bj <= ai and ++j < n
      if bj < ai
        out.push bj
      bj = b[j]

    out.push ai

  while j < n
    out.push b[j++]

  return out

#----------------------------------------------------------------------

#
# Align sequence (used for fuzzaldrin.match)
# Return position of subject characters that match query.
#
# Follow closely scorer.computeScore.
# Except at each step we record what triggered the best score.
# Then we trace back to output matched characters.
#
# Differences are:
# - we record the best move at each position in a matrix, and finish by a traceback.
# - we reset consecutive sequence if we do not take the match.
# - no hit miss limit


computeMatch = (subject, subject_lw, preparedQuery, offset = 0) ->
  query = preparedQuery.query
  query_lw = preparedQuery.query_lw

  m = subject.length
  n = query.length

  #this is like the consecutive bonus, but for camelCase / snake_case initials
  acro_score = scoreAcronyms(subject, subject_lw, query, query_lw).score

  #Init
  score_row = new Array(n)
  csc_row = new Array(n)

  # Directions constants
  STOP = 0
  UP = 1
  LEFT = 2
  DIAGONAL = 3

  #Traceback matrix
  trace = new Array(m * n)
  pos = -1

  #Fill with 0
  j = -1 #0..n-1
  while ++j < n
    score_row[j] = 0
    csc_row[j] = 0

  i = -1 #0..m-1
  while ++i < m #foreach char si of subject

    score = 0
    score_up = 0
    csc_diag = 0
    si_lw = subject_lw[i]

    j = -1 #0..n-1
    while ++j < n #foreach char qj of query

      #reset score
      csc_score = 0
      align = 0
      score_diag = score_up

      #Compute a tentative match
      if ( query_lw[j] is si_lw )

        start = isWordStart(i, subject, subject_lw)

        # Forward search for a sequence of consecutive char
        csc_score = if csc_diag > 0  then csc_diag else
          scoreConsecutives(subject, subject_lw, query, query_lw, i, j, start)

        # Determine bonus for matching A[i] with B[j]
        align = score_diag + scoreCharacter(i, j, start, acro_score, csc_score)

      #Prepare next sequence & match score.
      score_up = score_row[j] # Current score_up is next run score diag
      csc_diag = csc_row[j]

      #In case of equality, moving UP get us closer to the start of the candidate string.
      if(score > score_up )
        move = LEFT
      else
        score = score_up
        move = UP

      # Only take alignment if it's the absolute best option.
      if(align > score)
        score = align
        move = DIAGONAL
      else
        #If we do not take this character, break consecutive sequence.
        # (when consecutive is 0, it'll be recomputed)
        csc_score = 0

      score_row[j] = score
      csc_row[j] = csc_score
      trace[++pos] = if(score > 0) then move else STOP

  # -------------------
  # Go back in the trace matrix
  # and collect matches (diagonals)

  i = m - 1
  j = n - 1
  pos = i * n + j
  backtrack = true
  matches = []

  while backtrack and i >= 0 and j >= 0
    switch trace[pos]
      when UP
        i--
        pos -= n
      when LEFT
        j--
        pos--
      when DIAGONAL
        matches.push(i + offset)
        j--
        i--
        pos -= n + 1
      else
        backtrack = false

  matches.reverse()
  return matches

