/* Require packages */
const gulp = require('gulp')
const sass = require('gulp-sass')
const concat = require('gulp-concat')
const babel = require('gulp-babel')
const uglify = require('gulp-uglify')
const imagemin = require('gulp-imagemin')
const clean = require('gulp-clean')
const gulpSequence = require('gulp-sequence')
// const connect = require('gulp-connect')
const open = require('gulp-open')
const nodemon = require('gulp-nodemon')

/* === Tasks === */
/* Compile sass */
gulp.task('sass', () => {
  return gulp
    .src('src/styles/main.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('assets/css'))
})

/* Compile sass and minify for production */
gulp.task('sass-p', () => {
  return gulp
    .src('src/styles/main.scss')
    .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError))
    .pipe(gulp.dest('assets/css'))
})

/* Bundle scripts */
gulp.task('bundle', () => {
  return gulp
    .src('src/scripts/**/*.js')
    .pipe(concat('bundle.js'))
    .pipe(
      babel({
        presets: ['env']
      })
    )
    .pipe(gulp.dest('assets/js'))
})

/* Bundle scripts and minify */
gulp.task('bundle-p', () => {
  return gulp
    .src('src/scripts/**/*.js')
    .pipe(concat('bundle.js'))
    .pipe(
      babel({
        presets: ['es2015']
      })
    )
    .pipe(uglify())
    .pipe(gulp.dest('assets/js'))
})

/* Process images */
gulp.task('images', () => {
  return gulp
    .src('src/images/**/*')
    // .pipe(imagemin())
    .pipe(gulp.dest('assets/images'))
})

/* Process fonts */
gulp.task('fonts', () => {
  return gulp.src('src/fonts/*').pipe(gulp.dest('assets/fonts'))
})

/* Watch files for changes */
gulp.task('watch', () => {
  gulp.watch('src/styles/**/*.scss', ['sass'])
  gulp.watch('src/scripts/**/*.js', ['bundle'])
  gulp.watch('src/images/**/*', ['images'])
  gulp.watch('src/fonts/*', ['fonts'])
})

/* Remove assets folder to remove unused files */
gulp.task('clean', () => {
  return gulp.src('assets').pipe(clean())
})

gulp.task('nodemon', () => {
  nodemon({
    script: 'app.js',
    ext: 'js html'
  })
})

// Open browser at localhost:8001
gulp.task('open', () => {
  gulp.src('').pipe(open({ uri: 'http://localhost:8001' }))
})

// Combined tasks
gulp.task('default', [
  'nodemon',
  'sass',
  'bundle',
  'images',
  'fonts',
  'watch',
  // 'connect'
])
gulp.task(
  'start',
  gulpSequence(
    ['nodemon', 'sass', 'bundle', 'images', 'fonts', 'watch'],
    'open'
  )
)
gulp.task(
  'prod',
  gulpSequence('clean', ['sass-p', 'bundle-p', 'images', 'fonts'])
)
