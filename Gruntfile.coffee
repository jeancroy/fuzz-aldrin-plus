module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON('package.json')
    clean: ['lib','dist']
    coffee:
      glob_to_multiple:
        expand: true
        cwd: 'src'
        src: ['*.coffee']
        dest: 'lib'
        ext: '.js'

    coffeelint:
      options:
        no_empty_param_list:
          level: 'error'
        max_line_length:
          level: 'ignore'

      src: ['src/*.coffee']
      test: ['spec/*.coffee']
      gruntfile: ['Gruntfile.coffee']

    browserify:

      options:
        banner: '/* <%= pkg.name %> - v<%= pkg.version %> - @license: <%= pkg.license %>; @author: Jean Christophe Roy; @site: <%= pkg.homepage %> */\n'
        browserifyOptions:
          standalone: 'fuzzaldrin'

      dist:
        src: ['lib/fuzzaldrin.js']
        dest: 'dist-browser/fuzzaldrin-plus.js'


    uglify:

      options:
        preserveComments: false
        banner: '/* <%= pkg.name %> - v<%= pkg.version %> - @license: <%= pkg.license %>; @author: Jean Christophe Roy; @site: <%= pkg.homepage %> */\n'

      dist:
        src: 'dist-browser/fuzzaldrin-plus.js',
        dest: 'dist-browser/fuzzaldrin-plus.min.js'



    shell:
      test:
        command: 'node node_modules/jasmine-focused/bin/jasmine-focused --coffee --captureExceptions spec'
        options:
          stdout: true
          stderr: true
          failOnError: true
      mkdir:
        command: 'mkdir dist'
        options:
          stdout: true
          stderr: true
          failOnError: true


    nugetpack:
      dist:
        src: 'fuzzaldrin-plus.nuspec'
        dest: 'dist/'
        options:
          version: '<%= pkg.version %>'

    nugetpush:
      dist:
        src: 'dist/*.nupkg'
      options:
        apiKey: '<specify API key before executing nugetpush task>'
          
  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-shell')
  grunt.loadNpmTasks('grunt-coffeelint')
  grunt.loadNpmTasks('grunt-browserify')
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-nuget')

  grunt.registerTask('lint', ['coffeelint'])
  grunt.registerTask('test', ['default', 'shell:test'])
  grunt.registerTask('prepublish', ['clean', 'test', 'distribute'])
  grunt.registerTask('default', ['coffee', 'lint'])
  grunt.registerTask('distribute', ['default', 'browserify', 'uglify'])
  grunt.registerTask('packnuget', ['shell:mkdir', 'nugetpack'])
  grunt.registerTask('publishnuget', ['packnuget', 'nugetpush'])
