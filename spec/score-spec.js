import { expect } from 'chai';
import {score} from '../src/fuzzaldrin-plus';

describe("score(string, query)", () =>
    it("returns a score", function () {
        expect(score('Hello World', 'he')).to.be.below(score('Hello World', 'Hello'));
        expect(score('Hello World', '')).to.equal(0);
        expect(score('Hello World', null)).to.equal(0);
        expect(score('Hello World')).to.equal(0);
        expect(score()).to.equal(0);
        expect(score(null, 'he')).to.equal(0);
        expect(score('', '')).to.equal(0);
        expect(score('', 'abc')).to.equal(0);
    })
);
