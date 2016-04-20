fs = require 'fs'
path = require 'path'

fuzzaldrinPlus = require '../src/fuzzaldrin'
legacy = require 'fuzzaldrin'

lines = fs.readFileSync(path.join(__dirname, 'data.txt'), 'utf8').trim().split('\n')
forceAllMatch = {maxInners: -1}
mitigation = {maxInners: Math.floor(0.2 * lines.length)}

#warmup + compile
fuzzaldrinPlus.filter(lines, 'index', forceAllMatch)
legacy.filter(lines, 'index')

console.log("======")

startTime = Date.now()
results = fuzzaldrinPlus.filter(lines, 'index')
console.log("Filtering #{lines.length} entries for 'index' took #{Date.now() - startTime}ms for #{results.length} results (~10% of results are positive, mix exact & fuzzy)")

if results.length isnt 6168
  console.error("Results count changed! #{results.length} instead of 6168")
  process.exit(1)

startTime = Date.now()
results = legacy.filter(lines, 'index')
console.log("Filtering #{lines.length} entries for 'index' took #{Date.now() - startTime}ms for #{results.length} results (~10% of results are positive, Legacy method)")


console.log("======")

startTime = Date.now()
results = fuzzaldrinPlus.filter(lines, 'indx')
console.log("Filtering #{lines.length} entries for 'indx' took #{Date.now() - startTime}ms for #{results.length} results (~10% of results are positive, Fuzzy match)")

startTime = Date.now()
results = legacy.filter(lines, 'indx')
console.log("Filtering #{lines.length} entries for 'indx' took #{Date.now() - startTime}ms for #{results.length} results (~10% of results are positive, Fuzzy match, Legacy)")

console.log("======")

startTime = Date.now()
results = fuzzaldrinPlus.filter(lines, 'walkdr')
console.log("Filtering #{lines.length} entries for 'walkdr' took #{Date.now() - startTime}ms for #{results.length} results (~1% of results are positive, fuzzy)")

startTime = Date.now()
results = legacy.filter(lines, 'walkdr')
console.log("Filtering #{lines.length} entries for 'walkdr' took #{Date.now() - startTime}ms for #{results.length} results (~1% of results are positive, Legacy method)")


console.log("======")

startTime = Date.now()
results = fuzzaldrinPlus.filter(lines, 'node', forceAllMatch)
console.log("Filtering #{lines.length} entries for 'node' took #{Date.now() - startTime}ms for #{results.length} results (~98% of results are positive, mostly Exact match)")

startTime = Date.now()
results = legacy.filter(lines, 'node')
console.log("Filtering #{lines.length} entries for 'node' took #{Date.now() - startTime}ms for #{results.length} results (~98% of results are positive, mostly Exact match, Legacy method)")


console.log("======")

startTime = Date.now()
results = fuzzaldrinPlus.filter(lines, 'nm', forceAllMatch)
console.log("Filtering #{lines.length} entries for 'nm' took #{Date.now() - startTime}ms for #{results.length} results (~98% of results are positive, Acronym match)")

startTime = Date.now()
results = legacy.filter(lines, 'nm')
console.log("Filtering #{lines.length} entries for 'nm' took #{Date.now() - startTime}ms for #{results.length} results (~98% of results are positive, Acronym match, Legacy method)")


console.log("======")

startTime = Date.now()
results = fuzzaldrinPlus.filter(lines, 'nodemodules', forceAllMatch)
console.log("Filtering #{lines.length} entries for 'nodemodules' took #{Date.now() - startTime}ms for #{results.length} results (~98% positive + Fuzzy match, [Worst case scenario])")

startTime = Date.now()
results = fuzzaldrinPlus.filter(lines, 'nodemodules', mitigation)
console.log("Filtering #{lines.length} entries for 'nodemodules' took #{Date.now() - startTime}ms for #{results.length} results (~98% positive + Fuzzy match, [Mitigation])")

startTime = Date.now()
results = legacy.filter(lines, 'nodemodules')
console.log("Filtering #{lines.length} entries for 'nodemodules' took #{Date.now() - startTime}ms for #{results.length} results (Legacy)")

console.log("======")

startTime = Date.now()
results = fuzzaldrinPlus.filter(lines, 'ndem', forceAllMatch)
console.log("Filtering #{lines.length} entries for 'ndem' took #{Date.now() - startTime}ms for #{results.length} results (~98% positive + Fuzzy match, [Worst case but shorter srting])")

startTime = Date.now()
results = legacy.filter(lines, 'ndem')
console.log("Filtering #{lines.length} entries for 'ndem' took #{Date.now() - startTime}ms for #{results.length} results (Legacy)")


console.log("======")

startTime = Date.now()
query = 'index'
prepared = fuzzaldrinPlus.prepareQuery(query)
fuzzaldrinPlus.match(line, query, {preparedQuery: prepared}) for line in lines
console.log("Matching #{results.length} results for 'index' took #{Date.now() - startTime}ms (Prepare in advance)")

startTime = Date.now()
fuzzaldrinPlus.match(line, query) for line in lines
console.log("Matching #{results.length} results for 'index' took #{Date.now() - startTime}ms (cache)")
# replace by `prepQuery ?= scorer.prepQuery(query)`to test without cache.

startTime = Date.now()
legacy.match(line, query) for line in lines
console.log("Matching #{results.length} results for 'index' took #{Date.now() - startTime}ms (legacy)")
# replace by `prepQuery ?= scorer.prepQuery(query)`to test without cache.
