import {expect} from 'chai';
import {match} from '../src/fuzzaldrin-plus';
import path from 'path';

describe("match(string, query)", () => {

  it("returns an array of matched and unmatched strings", () => {

    expect(match('Hello World', 'he')).to.eql([0, 1]);
    expect(match()).to.eql([]);
    expect(match('Hello World', 'wor')).to.eql([6, 7, 8]);

    expect(match('Hello World', 'd')).to.eql([10]);
    expect(match('Hello World', 'elwor')).to.eql([1, 2, 6, 7, 8]);
    expect(match('Hello World', 'er')).to.eql([1, 8]);
    expect(match('Hello World', '')).to.eql([]);
    expect(match(null, 'he')).to.eql([]);
    expect(match('', '')).to.eql([]);
    expect(match('', 'abc')).to.eql([]);

  });

  it("matches paths with slashes", () => {
    expect(match(path.join('X', 'Y'), path.join('X', 'Y'))).to.eql([0, 1, 2]);
    expect(match(path.join('X', 'X-x'), 'X')).to.eql([0, 2]);
    expect(match(path.join('X', 'Y'), 'XY')).to.eql([0, 2]);
    expect(match(path.join('-', 'X'), 'X')).to.eql([2]);
    expect(match(path.join('X-', '-'), `X${path.sep}`)).to.eql([0, 2]);
  });

  it("double matches characters in the path and the base", () => {
    expect(match(path.join('XY', 'XY'), 'XY')).to.eql([0, 1, 3, 4]);
    expect(match(path.join('--X-Y-', '-X--Y'), 'XY')).to.eql([2, 4, 8, 11]);
  });

  it("prefer whole word to scattered letters", () => {
    expect(match('fiddle gruntfile filler', 'file')).to.eql([12, 13, 14, 15]);
    expect(match('fiddle file', 'file')).to.eql([7, 8, 9, 10]);
    expect(match('find le file', 'file')).to.eql([8, 9, 10, 11]);
  });

  it("prefer whole word to scattered letters, even without exact matches", () => {
    expect(match('fiddle gruntfile xfiller', 'filex')).to.eql([12, 13, 14, 15, 17]);
    expect(match('fiddle file xfiller', 'filex')).to.eql([7, 8, 9, 10, 12]);
    expect(match('find le file xfiller', 'filex')).to.eql([8, 9, 10, 11, 13]);
  });

  it("prefer exact match", () => expect(match('filter gruntfile filler', 'file')).to.eql([12, 13, 14, 15]));

  it("prefer case sensitive exact match", () => {
    expect(match('ccc CCC cCc CcC CCc', 'ccc')).to.eql([0, 1, 2]);
    expect(match('ccc CCC cCc CcC CCc', 'CCC')).to.eql([4, 5, 6]);
    expect(match('ccc CCC cCc CcC CCc', 'cCc')).to.eql([8, 9, 10]);
    expect(match('ccc CCC cCc CcC CCc', 'CcC')).to.eql([12, 13, 14]);
    expect(match('ccc CCC cCc CcC CCc', 'CCc')).to.eql([16, 17, 18]);
  });

  it("prefer camelCase to scattered letters", () => expect(match('ImportanceTableCtrl', 'itc')).to.eql([0, 10, 15]));

  it("prefer acronym to scattered letters", () => {
    expect(match('action_config', 'acon')).to.eql([0, 7, 8, 9]);
    expect(match('application_control', 'acon')).to.eql([0, 12, 13, 14]);
  });

  it("account for case in selecting camelCase vs consecutive", () => {
    expect(match('0xACACAC: CamelControlClass.ccc', 'CCC')).to.eql([10, 15, 22]);
    expect(match('0xACACAC: CamelControlClass.ccc', 'ccc')).to.eql([28, 29, 30]);
  });

  //it("limit consecutive inside word boundary", () => {});

});

// expect(match('Interns And Roles - Patterns Roles', 'interns roles')).to.eql
// [ 0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15, 16]
//
// the longest substring is "terns roles"
// it's also not very intuitive to split the word interns like that.
// limit consecutive at word boundary will help to prevent spiting words.
//
// Aside from doing more computation while scanning consecutive.
// The main problem is that we don't reset the consecutive count unless we encounter a negative match.
//




