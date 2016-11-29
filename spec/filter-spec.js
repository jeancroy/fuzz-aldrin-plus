import { expect } from 'chai';
import path from 'path';
import {filter, score} from '../src/fuzzaldrin-plus';

let bestMatch = function (candidates, query, options = {}) {

    let {debug} = options;
    if (debug != null) {
        console.log(`\n = Against query: ${query} = `);
        for (let c of candidates) {
            console.log(` ${score(c, query)}: ${c}`);
        }
    }

    return filter(candidates, query, options)[0];
};

let rootPath = function (...segments) {
    let joinedPath = process.platform === 'win32' ? 'C:\\' : '/';
    //joinedPath = path.sep
    for (let segment of segments) {
        if (segment === path.sep) {
            joinedPath += segment;
        } else {
            joinedPath = path.join(joinedPath, segment);
        }
    }
    return joinedPath;
};

describe("filtering", () => {

    it("returns an array of the most accurate results", () => {
        let candidates = ['Gruntfile', 'filter', 'bile', null, '', undefined];
        expect(filter(candidates, 'file')).to.eql(['Gruntfile', 'filter']);
    });

    it("require all character to be present", () => {
        let candidates = ["Application:Hide"];
        expect(filter(candidates, 'help')).to.eql([]);
    });

    it("support unicode character with different length uppercase", () => {

        let candidates = ["Bernauer Stra\u00DFe Wall"]; // Bernauer Straße Wall
        expect(filter(candidates, 'Stra\u00DFe Wall')).to.eql(candidates);
    });
    // before correction, The map ß->SS , place the W out of sync and prevent a match.
    // After correction we map ß->S.

    describe("when the maxResults option is set", () =>
        it("limits the results to the result size", () => {
            let candidates = ['Gruntfile', 'filter', 'bile'];
            expect(bestMatch(candidates, 'file')).to.equal('Gruntfile');
        })
    );


    //---------------------------------------------------
    //
    //                  Exact match
    //

    describe("when query is an exact match", () => {

        it("prefer match at word boundary (string limit)", () => {
            let candidates = ['0gruntfile0', 'gruntfile0', '0gruntfile'];
            expect(bestMatch(candidates, 'file')).to.equal(candidates[2]);
            expect(bestMatch(candidates, 'grunt')).to.equal(candidates[1]);
        });

        it("prefer match at word boundary (separator limit)", () => {
            let candidates = ['0gruntfile0', 'hello gruntfile0', '0gruntfile world'];
            expect(bestMatch(candidates, 'file')).to.equal(candidates[2]);
            expect(bestMatch(candidates, 'grunt')).to.equal(candidates[1]);
        });

        it("prefer match at word boundary (camelCase limit)", () => {
            let candidates = ['0gruntfile0', 'helloGruntfile0', '0gruntfileWorld'];
            expect(bestMatch(candidates, 'file')).to.equal(candidates[2]);
            expect(bestMatch(candidates, 'grunt')).to.equal(candidates[1]);
        });


        it("it ranks full-word > start-of-word > end-of-word > middle-of-word > split > scattered letters", () => {

            let candidates = [
                'controller',
                '0 co re 00',
                '0core0 000',
                '0core 0000',
                '0 core0 00',
                '0 core 000'
            ];

            let result = filter(candidates, 'core');

            expect(result[0]).to.equal(candidates[5]);
            expect(result[1]).to.equal(candidates[4]);
            expect(result[2]).to.equal(candidates[3]);
            expect(result[3]).to.equal(candidates[2]);
            expect(result[4]).to.equal(candidates[1]);
            expect(result[5]).to.equal(candidates[0]);
        });

        it("rank middle of word case-insensitive match better than complete word not quite exact match (sequence length is king)", () => {

            let candidates = [
                'ZFILEZ',
                'fil e'
            ];

            expect(bestMatch(candidates, 'file')).to.equal(candidates[0]);
        });

        it("prefer smaller haystack", () => {

            let candidates = [
                'core_',
                'core'
            ];

            expect(bestMatch(candidates, 'core')).to.equal(candidates[1]);
        });


        it("prefer match at the start of the string", () => {

            let candidates = [
                'data_core',
                'core_data'
            ];

            expect(bestMatch(candidates, 'core')).to.equal(candidates[1]);

            candidates = [
                'hello_data_core',
                'hello_core_data'
            ];

            expect(bestMatch(candidates, 'core')).to.equal(candidates[1]);
        });

        it("prefer single letter start-of-word exact match vs longer query", () => {

            let candidates = [
                'Timecop: View',
                'Markdown Preview: Copy Html'
            ];
            expect(bestMatch(candidates, 'm')).to.equal(candidates[1]);

            candidates = [
                'Welcome: Show',
                'Markdown Preview: Toggle Break On Newline'
            ];
            expect(bestMatch(candidates, 'm')).to.equal(candidates[1]);

            candidates = [
                'TODO',
                path.join('doc', 'README')
            ];
            expect(bestMatch(candidates, 'd')).to.equal(candidates[1]);
        });

        return it("can select a better occurrence that happens latter in string", () => {

            let candidates = [
                'Test Espanol',
                'Portuges'
            ];
            expect(bestMatch(candidates, 'es')).to.equal(candidates[0]);
        });
    });


    //---------------------------------------------------
    //
    //                  Consecutive letters
    //

    describe("when query match in multiple group", () => {

        it("ranks full-word > start-of-word > end-of-word > middle-of-word > scattered letters", () => {

            let candidates = [
                'model-controller',
                'model-0core0-000',
                'model-0core-0000',
                'model-0-core0-00',
                'model-0-core-000'
            ];

            let result = filter(candidates, 'modelcore');
            expect(result[0]).to.equal(candidates[4]);
            expect(result[1]).to.equal(candidates[3]);
            expect(result[2]).to.equal(candidates[2]);
            expect(result[3]).to.equal(candidates[1]);
            expect(result[4]).to.equal(candidates[0]);
        });

        it("ranks full-word > start-of-word > end-of-word > middle-of-word > scattered letters (VS directory depth)", () => {

            let candidates = [
                path.join('model', 'controller'),
                path.join('0', 'model', '0core0_0'),
                path.join('0', '0', 'model', '0core_00'),
                path.join('0', '0', '0', 'model', 'core0_00'),
                path.join('0', '0', '0', '0', 'model', 'core_000')
            ];

            let result = filter(candidates, 'model core');
            expect(result[0]).to.equal(candidates[4]);
            expect(result[1]).to.equal(candidates[3]);
            expect(result[2]).to.equal(candidates[2]);
            expect(result[3]).to.equal(candidates[1]);
            expect(result[4]).to.equal(candidates[0]);
        });


        it("weighs consecutive character higher than scattered letters", () => {

            let candidates = [
                'application.rb',
                'application_controller'
            ];
            expect(bestMatch(candidates, 'acon')).to.equal(candidates[1]);
        });

        it("prefers larger group of consecutive letter", () => {

            //Here all group score the same context (full word).

            let candidates = [
                'ab cd ef',
                ' abc def',
                ' abcd ef',
                ' abcde f',
                '  abcdef'
            ];

            let result = filter(candidates, 'abcdef');
            expect(result[0]).to.equal(candidates[4]);
            expect(result[1]).to.equal(candidates[3]);
            expect(result[2]).to.equal(candidates[2]);
            expect(result[3]).to.equal(candidates[1]);
            expect(result[4]).to.equal(candidates[0]);
        });

        it("prefers larger group of consecutive letter VS better context", () => {

            //Only apply when EVERY lowe quality context group are longer or equal length

            let candidates = [
                'ab cd ef', // 3 x 2
                '0abc0def0' // 2 x 3
            ];

            expect(bestMatch(candidates, 'abcdef')).to.equal(candidates[1]);

            candidates = [
                'ab cd ef', // 2 x 2 + 2
                '0abcd0ef0' // 1 x 4 + 2
            ];

            expect(bestMatch(candidates, 'abcdef')).to.equal(candidates[1]);
        });

        it("allows consecutive character in path overcome deeper path", () => {

            let candidates = [
                path.join('controller', 'app.rb'),
                path.join('controller', 'core', 'app.rb')
            ];
            expect(bestMatch(candidates, 'core app')).to.equal(candidates[1]);
        });

        return it("weighs matches at the start of the string or base name higher", () => {

            expect(bestMatch(['a_b_c', 'a_b'], 'ab')).to.equal('a_b');
            expect(bestMatch(['z_a_b', 'a_b'], 'ab')).to.equal('a_b');
            expect(bestMatch(['a_b_c', 'c_a_b'], 'ab')).to.equal('a_b_c');
        });
    });


    //---------------------------------------------------
    //
    //                  Acronym + Case Sensitivity
    //

    describe("when the entries contains mixed case", () => {

        it("weighs exact case matches higher", () => {
            let candidates = ['statusurl', 'StatusUrl'];
            expect(bestMatch(candidates, 'Status')).to.equal('StatusUrl');
            expect(bestMatch(candidates, 'status')).to.equal('statusurl');
            expect(bestMatch(candidates, 'statusurl')).to.equal('statusurl');
            expect(bestMatch(candidates, 'StatusUrl')).to.equal('StatusUrl');
        });

        it("accounts for case while selecting an acronym", () => {
            let candidates = ['statusurl', 'status_url', 'StatusUrl'];
            expect(bestMatch(candidates, 'SU')).to.equal('StatusUrl');
            expect(bestMatch(candidates, 'su')).to.equal('status_url');
            expect(bestMatch(candidates, 'st')).to.equal('statusurl');
        });

        it("weighs exact case matches higher", () => {

            let candidates = ['Diagnostic', 'diagnostics0000'];
            expect(bestMatch(candidates, 'diag')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'diago')).to.equal(candidates[1]);

            candidates = ['download_thread', 'DownloadTask'];
            expect(bestMatch(candidates, 'down')).to.equal(candidates[0]);
            expect(bestMatch(candidates, 'downt')).to.equal(candidates[0]);
            expect(bestMatch(candidates, 'downta')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'dt')).to.equal(candidates[0]);
            expect(bestMatch(candidates, 'DT')).to.equal(candidates[1]);
        });

        it("weighs case sentitive matches higher Vs directory depth", () => {

            let candidates = [path.join('0', 'Diagnostic'), path.join('0', '0', '0', 'diagnostics00')];
            expect(bestMatch(candidates, 'diag')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'diago')).to.equal(candidates[1]);
        });


        it("weighs abbreviation matches after spaces, underscores, and dashes the same", () => {
            expect(bestMatch(['sub-zero', 'sub zero', 'sub_zero'], 'sz')).to.equal('sub-zero');
            expect(bestMatch(['sub zero', 'sub_zero', 'sub-zero'], 'sz')).to.equal('sub zero');
            expect(bestMatch(['sub_zero', 'sub-zero', 'sub zero'], 'sz')).to.equal('sub_zero');
        });


        it("weighs acronym matches higher than middle of word letter", () => {

            let candidates = [
                'FilterFactors.html',
                'FilterFactorTests.html'
            ];

            // Alignment match "t" of factor preventing to score "T" of Test
            expect(bestMatch(candidates, 'FFT')).to.equal('FilterFactorTests.html');
        });

        it("prefers longer acronym to a smaller case sensitive one", () => {

            let candidates = [
                'efficient',
                'fun fact',
                'FileFactory',
                'FilterFactorTests.html'
            ];

            // fun fact is case-sensitive match for fft, but the t of fact is not an acronym
            expect(bestMatch(candidates, 'fft')).to.equal('FilterFactorTests.html');
            expect(bestMatch(candidates, 'ff')).to.equal('fun fact');
            expect(bestMatch(candidates, 'FF')).to.equal('FileFactory');
        });

        it("weighs acronym matches higher than middle of word exact match", () => {

            let candidates = [
                'switch.css',
                'ImportanceTableCtrl.js'
            ];
            expect(bestMatch(candidates, 'itc')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'ITC')).to.equal(candidates[1]);
        });

        it("allows to select between snake_case and CamelCase using case of query", () => {

            let candidates = [
                'switch.css',
                'user_id_to_client',
                'ImportanceTableCtrl.js'
            ];
            expect(bestMatch(candidates, 'itc')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'ITC')).to.equal(candidates[2]);
        });


        it("prefers CamelCase that happens sooner", () => {

            let candidates = [
                'anotherCamelCase',
                'thisCamelCase000',
            ];

            //We test once for exact acronym then for general purpose match.
            expect(bestMatch(candidates, 'CC')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'CCs')).to.equal(candidates[1]);
        });

        it("prefers CamelCase in shorter haystack", () => {

            let candidates = [
                'CamelCase0',
                'CamelCase',
            ];
            expect(bestMatch(candidates, 'CC')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'CCs')).to.equal(candidates[1]);
        });

        it("allows CamelCase to match across words", () => {

            let candidates = [
                'Gallas',
                'Git Plus: Add All', //skip the Plus, still get bonus.
            ];
            expect(bestMatch(candidates, 'gaa')).to.equal(candidates[1]);
        });

        it("allows CamelCase to match even outside of acronym prefix", () => {

            let candidates = [
                'Git Plus: Stash Save',
                'Git Plus: Add And Commit',
                'Git Plus: Add All',
            ];

            let result = filter(candidates, 'git AA');
            expect(result[0]).to.equal(candidates[2]);
            expect(result[1]).to.equal(candidates[1]);
            expect(result[2]).to.equal(candidates[0]);

            result = filter(candidates, 'git aa');
            expect(result[0]).to.equal(candidates[2]);
            expect(result[1]).to.equal(candidates[1]);
            expect(result[2]).to.equal(candidates[0]);
        });


        it("accounts for match structure in CamelCase vs Substring matches", () => {

            let candidates = [
                'Input: Select All',
                'Application: Install'
            ];

            expect(bestMatch(candidates, 'install')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'isa')).to.equal(candidates[0]);
            expect(bestMatch(candidates, 'isall')).to.equal(candidates[0]);

            candidates = [
                'Git Plus: Stage Hunk',
                'Git Plus: Push'
            ];

            expect(bestMatch(candidates, 'push')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'git push')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'psh')).to.equal(candidates[0]);
        });

        // expect(bestMatch(candidates, 'git PSH')).to.equal candidates[0]
        // expect(bestMatch(candidates, 'git psh')).to.equal candidates[0]
        //
        // not yet supported, because we only scan acronym structure on the start of the query (acronym prefix) :(
        // it might be possible to handle uppercase playing with case sensitivity instead of structure.


        it("accounts for case in CamelCase vs Substring matches", () => {

            let candidates = [
                'CamelCaseClass.js',
                'cccManagerUI.java'
            ];

            //We test once for exact acronym
            expect(bestMatch(candidates, 'CCC')).to.equal(candidates[0]);
            expect(bestMatch(candidates, 'ccc')).to.equal(candidates[1]);

            //then for general purpose match.
            expect(bestMatch(candidates, 'CCCa')).to.equal(candidates[0]);
            expect(bestMatch(candidates, 'ccca')).to.equal(candidates[1]);
        });

        return it("prefers acronym matches that correspond to the full candidate acronym", () => {
            let candidates = [
                'JaVaScript',
                'JavaScript'
            ];

            // <js vs JS> scores better than <js vs JVS>
            expect(bestMatch(candidates, 'js')).to.equal(candidates[1]);

            candidates = [
                'JSON',
                'J.S.O.N.',
                'JavaScript'
            ];

            // here 1:1 match outdo shorter start-of-word
            expect(bestMatch(candidates, 'js')).to.equal(candidates[2]);

            candidates = [
                'CSON',
                'C.S.O.N.',
                'CoffeeScript'
            ];

            // here 1:1 match outdo shorter start-of-word
            expect(bestMatch(candidates, 'cs')).to.equal(candidates[2]);
        });
    });


    //---------------------------------------------------
    //
    //                 Path / Fuzzy finder
    //

    describe("when the entries contains slashes", () => {

        it("weighs basename matches higher", () => {

            let candidates = [
                rootPath('bar', 'foo'),
                rootPath('foo', 'bar')
            ];
            expect(bestMatch(candidates, 'bar')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'br')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'b')).to.equal(candidates[1]);

            candidates = [
                path.join('foo', 'bar'),
                'foobar',
                'FooBar',
                'foo_bar',
                'foo bar'
            ];
            expect(bestMatch(candidates, 'bar')).to.equal(candidates[0]);
            expect(bestMatch(candidates, 'br')).to.equal(candidates[0]);
            expect(bestMatch(candidates, 'b')).to.equal(candidates[0]);
        });

        it("prefers shorter basename", () => {

            // here full path is same size, but basename is smaller
            let candidates = [
                path.join('test', 'core_'),
                path.join('test', '_core'),
                path.join('test_', 'core'),
            ];

            expect(bestMatch(candidates, 'core')).to.equal(candidates[2]);
        });

        it("prefers matches that are together in the basename (even if basename is longer)", () => {

            let candidates = [
                path.join('tests', 'buyers', 'orders_e2e.js'),
                path.join('tests', 'buyers', 'users-addresses_e2e.js')
            ];

            expect(bestMatch(candidates, 'us_e2')).to.equal(candidates[1]);


            candidates = [
                path.join('app', 'controllers', 'match_controller.rb'),
                path.join('app', 'controllers', 'application_controller.rb')
            ];

            expect(bestMatch(candidates, 'appcontr')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'appcontro')).to.equal(candidates[1]);
        });
        //expect(bestMatch(candidates, 'appcontrol', debug:true)).to.equal candidates[1] # TODO support this case ?
        //expect(bestMatch(candidates, 'appcontroll', debug:true)).to.equal candidates[1] #Also look at issue #6


        it("allows to select using folder name", () => {

            let candidates = [
                path.join('model', 'core', 'spec.rb'),
                path.join('model', 'controller.rb')
            ];

            expect(bestMatch(candidates, 'model core')).to.equal(candidates[0]);
            expect(bestMatch(candidates, path.join('model', 'core'))).to.equal(candidates[0]);
        });

        it("weighs basename matches higher than folder name", () => {

            let candidates = [
                path.join('model', 'core', 'spec.rb'),
                path.join('spec', 'model', 'core.rb')
            ];

            expect(bestMatch(candidates, 'model core')).to.equal(candidates[1]);
            expect(bestMatch(candidates, path.join('model', 'core'))).to.equal(candidates[1]);
        });

        it("allows to select using acronym in path", () => {

            let candidates = [
                path.join('app', 'controller', 'admin_controller'),
                path.join('app', 'asset', 'javascript_admin')
            ];

            expect(bestMatch(candidates, 'acadmin')).to.equal(candidates[0]);

            candidates = [
                path.join('app', 'controller', 'macabre_controller'),
                path.join('app', 'controller', 'articles_controller')
            ];

            expect(bestMatch(candidates, 'aca')).to.equal(candidates[1]);
        });

        it("weighs exact basename matches higher than acronym in path", () => {

            let candidates = [
                path.join('c', 'o', 'r', 'e', 'foobar'),
                path.join('f', 'o', 'o', 'b', 'a', 'r', 'core')
            ];

            expect(bestMatch(candidates, 'core')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'foo')).to.equal(candidates[0]);
        });

        it("prefers file of the specified extension when useExtensionBonus is true ", () => {

            let candidates = [
                path.join('meas_astrom', 'include', 'Isst', 'meas', 'astrom', 'matchOptimisticB.h'),
                path.join('IsstDoxygen', 'html', 'match_optimistic_b_8cc.html')
            ];

            expect(bestMatch(candidates, 'mob.h', {useExtensionBonus: true})).to.equal(candidates[0]);

            candidates = [
                path.join('matchOptimisticB.htaccess'),
                path.join('matchOptimisticB_main.html')
            ];

            expect(bestMatch(candidates, 'mob.ht', {useExtensionBonus: true})).to.equal(candidates[1]);
        });

        it("support file with multiple extension", () => {
            let candidates = [
                path.join('something-foobar.class'),
                path.join('something.class.php')
            ];

            expect(bestMatch(candidates, 'some.cl', {useExtensionBonus: true})).to.equal(candidates[1]);
        });


        it("ignores trailing slashes", () => {

            let candidates = [
                rootPath('bar', 'foo'),
                rootPath('foo', 'bar', path.sep, path.sep, path.sep, path.sep, path.sep)
            ];
            expect(bestMatch(candidates, 'bar')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'br')).to.equal(candidates[1]);
        });


        return it("allows candidates to be all slashes", () => {
            let candidates = [path.sep, path.sep + path.sep + path.sep];
            expect(filter(candidates, 'bar')).to.eql([]);
        });
    });


    describe("when the Query contains slashes (queryHasSlashes)", () => {

        it("weighs end-of-path matches higher", () => {

            let candidates = [
                path.join('project', 'folder', 'folder', 'file'),
                path.join('folder', 'folder', 'project', 'file')
            ];

            expect(bestMatch(candidates, 'project file')).to.equal(candidates[0]);
            expect(bestMatch(candidates, path.join('project', 'file'))).to.equal(candidates[1]);
        });

        return it("prefers overall better match to shorter end-of-path length", () => {

            let candidates = [

                path.join('CommonControl', 'Controls', 'Shared'),
                path.join('CommonControl', 'Controls', 'Shared', 'Mouse'),
                path.join('CommonControl', 'Controls', 'Shared', 'Keyboard'),
                path.join('CommonControl', 'Controls', 'Shared', 'Keyboard', 'cc.js')

            ];

            expect(bestMatch(candidates, path.join('CC', 'Controls', 'Shared'))).to.equal(candidates[0]);
            expect(bestMatch(candidates, 'CC Controls Shared')).to.equal(candidates[0]);


            expect(bestMatch(candidates, 'CCCShared')).to.equal(candidates[0]);
            expect(bestMatch(candidates, 'ccc shared')).to.equal(candidates[0]);
            expect(bestMatch(candidates, 'cc c shared')).to.equal(candidates[0]);

            expect(bestMatch(candidates, path.join('ccc', 'shared'))).to.equal(candidates[0]);
            expect(bestMatch(candidates, path.join('cc', 'c', 'shared'))).to.equal(candidates[0]);
        });
    });


    describe("when the entries are of differing directory depths", () => {

        it("prefers shallow path", () => {

            let candidates = [
                path.join('b', 'z', 'file'),
                path.join('b_z', 'file')
            ];

            expect(bestMatch(candidates, "file")).to.equal(candidates[1]);
            expect(bestMatch(candidates, "fle")).to.equal(candidates[1]);

            candidates = [
                path.join('foo', 'bar', 'baz', 'file'),
                path.join('foo', 'bar_baz', 'file')
            ];

            expect(bestMatch(candidates, "file")).to.equal(candidates[1]);
            expect(bestMatch(candidates, "fle")).to.equal(candidates[1]);

            candidates = [
                path.join('A Long User Full-Name', 'My Documents', 'file'),
                path.join('bin', 'lib', 'src', 'test', 'spec', 'file')
            ];

            expect(bestMatch(candidates, "file")).to.equal(candidates[0]);
        });

        // We have plenty of report on how this or that should win because file is a better basename match
        // But we have no report of searching too deep, because of that folder-depth penalty is pretty weak.


        it("allows better basename match to overcome slightly deeper directory / longer overall path", () => {

            let candidates = [
                path.join('f', '1_a_z'),
                path.join('f', 'o', 'a_z')
            ];

            expect(bestMatch(candidates, 'az')).to.equal(candidates[1]);

            candidates = [
                path.join('app', 'models', 'automotive', 'car.rb'),
                path.join('spec', 'carts.rb')
            ];

            expect(bestMatch(candidates, 'car.rb')).to.equal(candidates[0]);

            candidates = [
                path.join('application', 'applicationPageStateServiceSpec.js'),
                path.join('view', 'components', 'actions', 'actionsServiceSpec.js')
            ];

            expect(bestMatch(candidates, 'actionsServiceSpec.js')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'ss')).to.equal(candidates[1]);


            candidates = [
                path.join('spec', 'models', 'user_search_spec.rb'),
                path.join('spec', 'models', 'listing', 'location_detection', 'usa_spec.rb')
            ];

            expect(bestMatch(candidates, 'usa_spec')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'usa spec')).to.equal(candidates[1]);
            expect(bestMatch(candidates, 'usa')).to.equal(candidates[1]);

            candidates = [
                path.join('spec', 'models', 'usa_spec.rb'),
                path.join('spec', 'models', 'listing', 'location_detection', 'user_search_spec.rb')
            ];

            expect(bestMatch(candidates, 'user')).to.equal(candidates[1]);

            candidates = [
                path.join('lib', 'exportable.rb'),
                path.join('app', 'models', 'table.rb')
            ];
            expect(bestMatch(candidates, 'table')).to.equal(candidates[1]);


            candidates = [
                path.join('db', 'emails', 'en', 'refund_notification.html'),
                path.join('app', 'views', 'admin', 'home', 'notification.erb')
            ];

            expect(bestMatch(candidates, 'notification')).to.equal(candidates[1]);

            candidates = [
                path.join('db', 'emails', 'en', 'refund_notification.html'),
                path.join('app', 'views', 'admin', 'home', '_notification_admin.erb')
            ];

            expect(bestMatch(candidates, '_notification')).to.equal(candidates[1]);

            candidates = [
                path.join('javascript', 'video-package', 'video-backbone.js'),
                path.join('third_party', 'javascript', 'project-src', 'backbone', 'backbone.js')
            ];

            expect(bestMatch(candidates, 'backbone')).to.equal(candidates[1]);

            candidates = [
                path.join('spec', 'controllers', 'apps_controller_spec.rb'),
                path.join('app', 'controllers', 'api_v2_featured', 'apps_controller.rb')
            ];

            expect(bestMatch(candidates, 'apps_controller')).to.equal(candidates[1]);

            candidates = [
                path.join('config', 'application.rb'),
                path.join('app', 'controllers', 'application_controller.rb')
            ];

            expect(bestMatch(candidates, 'appcon')).to.equal(candidates[1]);
        });


        return it("prefer path together to shorter path", () => {

            let candidates = [
                path.join('app', 'controllers', 'shipments_controller.rb'),
                path.join('app', 'controllers', 'core', 'shipments_controller.rb')
            ];

            expect(bestMatch(candidates, 'core shipments controller')).to.equal(candidates[1]);
        });
    });

    //
    //  Optional Characters
    //

    describe("when the query contain optional characters (generalize when the entries contains spaces)", () => {

        it("allows to match path using either backward slash, forward slash, space or colon", () => {

            let candidates = [
                path.join('foo', 'bar'),
                path.join('model', 'user'),
            ];

            expect(bestMatch(candidates, "model user")).to.equal(candidates[1]);
            expect(bestMatch(candidates, "model/user")).to.equal(candidates[1]);
            expect(bestMatch(candidates, "model\\user")).to.equal(candidates[1]);
            expect(bestMatch(candidates, "model::user")).to.equal(candidates[1]);
        });

        it("prefer matches where the optional character is present", () => {

            let candidates = [
                'ModelUser',
                'model user',
                'model/user',
                'model\\user',
                'model::user',
                'model_user',
                'model-user',
            ];

            expect(bestMatch(candidates, "mdl user")).to.equal(candidates[1]);
            expect(bestMatch(candidates, "mdl/user")).to.equal(candidates[2]);
            expect(bestMatch(candidates, "mdl\\user")).to.equal(candidates[3]);
            expect(bestMatch(candidates, "mdl::user")).to.equal(candidates[4]);
            expect(bestMatch(candidates, "mdl_user")).to.equal(candidates[5]);
            expect(bestMatch(candidates, "mdl-user")).to.equal(candidates[6]);
        });


        it("weighs basename matches higher (space don't have a strict preference for slash)", () => {

            let candidates = [
                rootPath('bar', 'foo'),
                rootPath('foo', 'bar foo')
            ];
            expect(bestMatch(candidates, 'br f')).to.equal(candidates[1]);
        });

        it("allows basename bonus to handle query with folder", () => {

            // Without support for optional character, the basename bonus
            // would not be able to find "model" inside "user.rb" so the bonus would be 0

            let candidates = [
                path.join('www', 'lib', 'models', 'user.rb'),
                path.join('migrate', 'moderator_column_users.rb')
            ];

            expect(bestMatch(candidates, "model user")).to.equal(candidates[0]);
            expect(bestMatch(candidates, "modeluser")).to.equal(candidates[0]);
            expect(bestMatch(candidates, path.join("model", "user"))).to.equal(candidates[0]);

            candidates = [
                path.join('destroy_discard_pool.png'),
                path.join('resources', 'src', 'app_controller.coffee')
            ];

            expect(bestMatch(candidates, "src app")).to.equal(candidates[1]);
            expect(bestMatch(candidates, path.join("src", "app"))).to.equal(candidates[1]);

            candidates = [
                path.join('template', 'emails-dialogs.handlebars'),
                path.join('emails', 'handlers.py')
            ];

            expect(bestMatch(candidates, "email handlers")).to.equal(candidates[1]);
            expect(bestMatch(candidates, path.join("email", "handlers"))).to.equal(candidates[1]);
        });


        return it("allows to select between full query and basename using path.sep", () => {

            let candidates = [
                path.join('models', 'user.rb'),
                path.join('migrate', 'model_users.rb')
            ];

            expect(bestMatch(candidates, "modeluser")).to.equal(candidates[1]);
            expect(bestMatch(candidates, "model user")).to.equal(candidates[1]);
            expect(bestMatch(candidates, path.join("model", "user"))).to.equal(candidates[0]);
        });
    });

    describe("when query is made only of optional characters", () =>
        it("only return results having at least one specified optional character", () => {
            let candidates = ["bla", "_test", " test"];
            expect(filter(candidates, '_')).to.eql(['_test']);
        }));


    //---------------------------------------------------
    //
    //                 Command Palette
    //


    return describe("When entry are sentence / Natural language", () => {

        it("prefers consecutive characters at the start of word", () => {

            let candidates = [
                'Find And Replace: Select All',
                'Settings View: Uninstall Packages',
                'Settings View: View Installed Themes',
                'Application: Install Update',
                'Install'
            ];

            let result = filter(candidates, 'install');
            expect(result[0]).to.equal(candidates[4]);
            expect(result[1]).to.equal(candidates[3]);
            expect(result[2]).to.equal(candidates[2]);
            expect(result[3]).to.equal(candidates[1]);
            expect(result[4]).to.equal(candidates[0]);

            // Even when we do not have an exact match

            result = filter(candidates, 'instll');
            expect(result[0]).to.equal(candidates[4]);
            expect(result[1]).to.equal(candidates[3]);
            expect(result[2]).to.equal(candidates[2]);
            expect(result[3]).to.equal(candidates[1]);
            expect(result[4]).to.equal(candidates[0]);
        });

        // for this one, complete word "Install" should win against:
        //
        //  - case-sensitive end-of-word match "Uninstall",
        //  - start of word match "Installed",
        //  - double acronym match "in S t A ll" -> "Select All"
        //
        //  also "Install" by itself should win against "Install" in a sentence


        return it("weighs substring higher than individual characters", () => {

            let candidates = [
                'Git Plus: Stage Hunk',
                'Git Plus: Reset Head',
                'Git Plus: Push',
                'Git Plus: Show'
            ];
            expect(bestMatch(candidates, 'push')).to.equal(candidates[2]);
            expect(bestMatch(candidates, 'git push')).to.equal(candidates[2]);
            expect(bestMatch(candidates, 'gpush')).to.equal(candidates[2]);
        });
    });
});

// Here "Plus Stage Hunk" accidentally match acronym on PuSH.
// Using two words disable exactMatch bonus, we have to rely on consecutive match

