// Gulp imports
const gulp = require('gulp');
const eslint = require('gulp-eslint');
const mocha = require('gulp-mocha');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const gulpif = require('gulp-if');
const nuget = require('gulp-nuget');

const named = require('vinyl-named');
const runSequence = require('run-sequence');

// Other libraries
const del = require('del');
const webpack = require('webpack-stream');
const request = require('request');
const fs = require('fs');

//pakage.config
const pkg = require('./package.json');


const options = {
    sources: ['src/**/*.js'],
    entryPoints: ['src/fuzzaldrin-plus.js'],
    outputDir: 'dist/',
    test: ['spec/*-spec.js'],
    clean: ['dist/**/*'],
    nugetpath: 'nuget.exe',
    nuspec: 'fuzzaldrin-plus.nuspec',
    nupkg: 'fuzzaldrin-plus.{v}.nuspec'
};

gulp.task('default', (done) => {
    //normally gulp run task in parallel, this force a sequence.
    runSequence('test', 'clean', 'build', 'post-build', () => {done();});
});

gulp.task('build', ['build-browser-dev', 'build-browser', 'build-node'], (done) => {done()} );

gulp.task('post-build', ['nuget-if-win'], (done) => {done()} );


// Linting
gulp.task('lint', () => {
    //Clean source files, spec files and config files at the root.
    let files = [].concat(options.sources,options.test, "*.js" );
    return gulp.src(files)
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

//This batch correct some lint errors (mostly whitespaces)
gulp.task('lint-fix', () => {
    //Clean source files, spec files and config files at the root.
    let files = [].concat(options.sources,options.test, "*.js" );
    return gulp.src(files)
        .pipe(eslint({fix:true}))
        .pipe(eslint.format())
});

// Unit tests
gulp.task('test', () => {

    // Needed for mocha tests
    require('babel-core/register');

    return gulp.src(options.test, {read: false})
               .pipe(mocha())

});

//Try to run unit test with debugger (and see why a test fail)
gulp.task('test-debug', () => {

    // Needed for mocha tests
    // However may not work with debug process
    require('babel-core/register');

    let spawn = require('child_process').spawn;
    let path = require('path');

    spawn('node', [
        '--debug-brk',
        path.join(__dirname, 'node_modules/gulp/bin/gulp.js'),
        'test'
    ], { stdio: 'inherit' });

});



// Babel + uglify
gulp.task('build-node', () => {

    return gulp.src(options.sources)
        .pipe(babel({
            presets: ['es2015']
        }))
        // preserve jsdoc by not uglify main document
        //.pipe(gulpif(/^lib/, uglify()))
        .pipe(gulp.dest(options.outputDir + "node/"));

});

// Create minified bundle
gulp.task('build-browser', () => {
    let wpConfig= require('./webpack.release.config');
    return gulp.src(options.entryPoints)
        .pipe(named())
        .pipe(webpack(wpConfig(options)))
        .pipe(gulp.dest(options.outputDir + "browser/"));

});

// Create bundle
gulp.task('build-browser-dev', () => {
    let wpConfig = require('./webpack.config');
    return gulp.src(options.entryPoints)
        .pipe(named())
        .pipe(webpack(wpConfig(options)))
        .pipe(gulp.dest(options.outputDir + "browser/"));
});


//
// nuggets
//

gulp.task('nuget-if-win', (done) => {

    if(process.platform === "win32"){
        runSequence('nuget-pack', done)
    }else{
        done();
    }

});


gulp.task('nuget-download', (done) => {

    if(fs.existsSync(options.nugetpath)) {
        return done();
    }

    request.get('http://nuget.org/nuget.exe')
        .pipe(fs.createWriteStream(options.nugetpath))
        .on('close', done);
});

gulp.task('nuget-pack', ['nuget-download'], () => {

    return gulp.src(options.nuspec)
        .pipe(nuget.pack({ nuget: options.nugetpath, version: pkg.version }))
        .pipe(gulp.dest(options.outputDir + "nuget/"));


});



// Clean state
gulp.task('clean', (cb) => {
    return del(options.clean, cb);
});

