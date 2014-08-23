
module.exports = function (grunt) {
  var DEV = "production" !== process.env.NODE_ENV;

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.registerTask('default', ['build', 'watch']);
  if (DEV)
    grunt.registerTask('build', ['browserify', 'stylus']);
  else
    grunt.registerTask('build', ['browserify', 'uglify', 'stylus']);

  grunt.initConfig({
    uglify: {
      prod: {
        src: 'bundle.js',
        dest: 'bundle.min.js'
      }
    },
    stylus: {
      app: {
        src: 'src/index.styl',
        dest: 'bundle.css'
      }
    },
    browserify: {
      app: {
        src: 'src/index.js',
        dest: 'bundle.js',
        options: {
          debug: DEV
        }
      }
    },
    watch: {
      options: {
        livereload: 35246
      },
      js: {
        files: ['src/**/*.json', 'src/**/*.js'],
        tasks: ['browserify'],
      },
      css: {
        files: ['src/**/*.styl'],
        tasks: ['stylus']
      }
    }
  });
};
