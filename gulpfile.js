var gulp = require('gulp'),
    concat = require('gulp-concat'),
    neat = require('node-neat'),
    please = require('gulp-pleeease'),
    plumber = require('gulp-plumber'),
    sass = require('gulp-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    util = require('gulp-util'),
    bower = require('gulp-bower'),
    mainBowerFiles = require('main-bower-files'),
    path = require('path'),
    jscs = require('gulp-jscs'),
    runSequence = require('run-sequence'),
    styleguide = require('./lib/styleguide'),
    distPath = './lib/dist',
    fs = require('fs'),
    chalk = require('chalk'),
    configPath = util.env.config ? util.env.config.replace(/\/$/, '') : null,
    outputPath = util.env.output ? util.env.output.replace(/\/$/, '') : '',
    sourcePath = util.env.source ? util.env.source.replace(/\/$/, '') : '',
    config = configPath ? require(configPath) : {};

/* Tasks for development */
gulp.task('serve', function() {
  var serverModule = require('./lib/server')(sourcePath, outputPath),
    app = serverModule.app,
    server = serverModule.server;

  app.set('port', util.env.port || 3000);
  server = server.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + server.address().port);
  });
});

gulp.task('jscs', function() {
  return gulp.src([
    '*.js',
    'lib/*.js',
    'test/*.js',
    'lib/app/js/app.js',
    'lib/app/js/controllers/**/**.js',
    'lib/app/js/directives/**/**.js',
    'lib/app/js/services/**/**.js'
  ])
  .pipe(jscs());
});

gulp.task('styleguide', function() {
  var distPath = '/lib/dist';
  if (!fs.existsSync(__dirname + distPath)) {
    process.stderr.write(chalk.red.bold('Error:') + ' Directory ' + distPath + ' does not exist. You probably installed library by cloning repository directly instead of NPM repository.\n');
    process.stderr.write('You need to run ' + chalk.green.bold('gulp build') + ' first\n');
    process.exit(1)
    return 1;
  }
  // Resolve overviewPath in relation to config file location
  var overviewPath;
  if (config.overviewPath) {
    overviewPath = path.resolve(path.dirname(configPath), config.overviewPath);
  }
  return gulp.src([sourcePath + '/**/*.scss'])
    .pipe(styleguide({
      extraHead: config.extraHead,
      overviewPath: overviewPath,
      sass: {
        loadPath: neat.includePaths
      }
    }))
    .pipe(gulp.dest(outputPath));
});

gulp.task('js:app', function() {
  return gulp.src(['lib/app/js/**/*.js', '!lib/app/js/vendor/**/*.js'])
    .pipe(plumber())
    .pipe(concat('app.js'))
    .pipe(gulp.dest(distPath + '/js'));
});

gulp.task('js:vendor', ['bower'], function() {
  return gulp.src(['lib/app/js/vendor/**/*.js'].concat(mainBowerFiles({filter: /\.js/})))
    .pipe(plumber())
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest(distPath + '/js'));
});

gulp.task('bower', function() {
  return bower();
});

gulp.task('sass', function() {
  return gulp.src('lib/app/sass/**/*.scss')
    .pipe(plumber())
    .pipe(sass({
      // Include bourbon & neat
      includePaths: neat.includePaths
    }))
    .pipe(sourcemaps.init())
    .pipe(please({
      minifier: false
    }))
    .pipe(gulp.dest(distPath + '/css'));
});

gulp.task('demo', function() {
  configPath = __dirname + '/demo/source/styleguide_config.json';
  outputPath = __dirname + '/demo/output';
  sourcePath = __dirname + '/demo/source';
  return runSequence('styleguide', 'serve');
});

gulp.task('html', function() {
  return gulp.src('lib/app/**/*.html')
    .pipe(gulp.dest(distPath + '/'));
});

gulp.task('assets', function() {
  return gulp.src('lib/app/assets/**')
    .pipe(gulp.dest(distPath + '/assets'));
});

gulp.task('watch', ['serve'], function() {
  // Do intial full build and create styleguide
  runSequence('build', 'styleguide');

  gulp.watch('lib/app/sass/**/*.scss', function() {
    runSequence('sass', 'styleguide');
  });
  gulp.watch(['lib/app/js/**/*.js', '!lib/app/js/vendor/**/*.js'], function() {
    runSequence('js:app', 'styleguide');
  });
  gulp.watch('lib/app/js/vendor/**/*.js', function() {
    runSequence('js:vendor', 'styleguide');
  });
  gulp.watch('lib/app/**/*.html', function() {
    runSequence('html', 'styleguide');
  });
  gulp.watch('lib/styleguide.js', ['styleguide']);
  gulp.watch(sourcePath + '/**', ['styleguide']);
});

gulp.task('build', ['sass', 'js:app', 'js:vendor', 'html', 'assets']);
