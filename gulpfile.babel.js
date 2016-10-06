import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import del from 'del';
import panini from 'panini';
import BrowserSync from 'browser-sync'

const browserSync = BrowserSync.create();

const $ = gulpLoadPlugins();
const productionEnv = $.util.env.env === 'production';

const paths = {
  appRoot: {
    src: 'app/',
    dest: 'dist/'
  },
  styles: {
    manifesto: 'app/stylesheets/application.scss',
    src:  'app/stylesheets/**/*.{scss, sass}',
    dest: 'dist/stylesheets'
  },
  scripts: {
    src:  'app/scripts/**/*.{js, coffee}',
    dest: 'dist/scripts/'
  },
  images: {
    src:  'app/assets/images/**/*.{jpg,jpeg,png,gif,webp}',
    dest: 'dist/assets/images/'
  },
  fonts: {
    src:  'app/assets/fonts/**/{*.woff, *.woff2}',
    dest: 'dist/assets/fonts/'
  },
  views: {
    src: 'app/views/',
    dest: 'dist/'
  }
};


export function handleError(task) {
  return function (err) {

    $.notify.onError({
      message: task + ' failed, check the logs..',
      sound: true
    })(err);

    $.util.log($.util.colors.bgRed(task + ' error:'), $.util.colors.red(err));
    this.emit('end');
  };
};

/*
 * For small tasks you can use arrow functions and export
 */
const clean = (done) => del([ paths.appRoot.dest ], done);
export { clean }

// export function clean(done) { 
//  del([ paths.appRoot.dest ])
//  done()
// }

/*Copy Common App RootFiles */
export function copyRootFiles() {
  return gulp.src([paths.appRoot.src + '/*.*', paths.appRoot.src + '/CNAME'], {since: gulp.lastRun('copyRootFiles'), dot: true})
    .pipe(gulp.dest(paths.appRoot.dest));
}

/*
 * Copy & Optimize static assets
 */
export function images() {
  return gulp.src(paths.images.src, {since: gulp.lastRun('images')})
    .pipe($.newer(paths.images.dest))  // pass through newer images only
    .pipe($.imagemin({
      optimizationLevel: 5,
      progressive: true,
      interlaced: true
    }))
    .pipe(gulp.dest(paths.images.dest));
}

/*Copy paste fonts*/
export function fonts() {
  return gulp.src(paths.fonts.src, {since: gulp.lastRun('fonts')})
    .pipe(gulp.dest(paths.fonts.dest));
}


/*
 * STYESHEETS
 */
export function styles() {
  return gulp.src(paths.styles.manifesto)
    .pipe($.plumber())
    .pipe($.if(!productionEnv, $.sourcemaps.init({
      loadMaps: true
    })))
    .pipe($.sass({
      precision: 10,
      sourceComments: !productionEnv,
      outputStyle: productionEnv ? 'compressed' : 'nested'
    }))
    .on('error', handleError('styles'))
    .pipe($.autoprefixer({
      browsers: [
        'last 2 versions',
        'ie >= 10',
        'android >= 4.4'
      ]
    }))
    .pipe($.if(productionEnv,$.cleanCss()))
    .pipe($.rename({
      basename: 'app'
    }))
    .pipe($.if(!productionEnv, $.sourcemaps.write({
      includeContent: true,
      sourceRoot: '.'
    })))
    .pipe(gulp.dest(paths.styles.dest))
    .pipe(browserSync.reload({stream: true}))
}

export function scripts() {
  return gulp.src(paths.scripts.src, { sourcemaps: true })
    .pipe($.cached('scripts'))    
    .pipe($.babel())
    .pipe($.if(productionEnv, $.uglify()))
    .pipe($.remember('scripts'))
    .pipe($.concat('app.js'))
    .pipe(gulp.dest(paths.scripts.dest));
}


/*
 * Static sites like a bauss using Panini by Zurb
 *
 * repo: https://github.com/zurb/panini
 */
export function views() {
  return gulp.src(paths.views.src + 'pages/**/*.html' )
    .pipe(panini({
      root: paths.views.src + 'pages/',
      layouts: paths.views.src + 'layouts/',
      partials: paths.views.src + 'partials/**/',
      helpers: paths.views.src + 'helpers/',
      data: paths.views.src + 'data/'
    }))
    .pipe(
      $.if (productionEnv,
        $.htmlmin({
          removeComments: true,
          collapseWhitespace: true,
          collapseBooleanAttributes: true,
          removeAttributeQuotes: true,
          removeRedundantAttributes: true,
          removeEmptyAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          removeOptionalTags: true
        })))
    .pipe(gulp.dest(paths.views.dest))

}

export function paniniRefresh(done){
  panini.refresh()
  done()
}

export function viewsBuildAndStream() {
  return views()
    .pipe(browserSync.stream())
}

export function paniniRebuild() {
  return gulp.series(
    paniniRefresh,
    viewsBuildAndStream
  );
};


/*
 * Local server using BrowserSync
 */
export function browserSyncServer(done){
  var config = {
      server: {
        baseDir: paths.appRoot.dest,
      }
  }
  //run TUNNEL=true gulp to start public tunnel url to share.
  if (process.env.TUNNEL === 'true') {
    config.tunnel = "";
  }

  browserSync.init(config);
  done()
}



/*
 * Listen for Changes
 */
export function watch() {
  gulp.watch(paths.images.src,  images);
  gulp.watch(paths.fonts.src,   fonts);
  gulp.watch(paths.styles.src,  styles);
  gulp.watch(paths.scripts.src, scripts);
  gulp.watch(paths.views.src,   paniniRebuild());

  $.util.log($.util.colors.bgGreen('Watching for changes...'));
}


/*
 * Build
 *
 * Create a deployable folder
 */
const build = gulp.series(
  clean, 
  gulp.parallel(
    images,
    fonts,
    styles, 
    scripts,
    views
  )
);


/*
 * Serve
 *
 * Serve the deployable folder watch for changes and start a dev server
 */
const serve = gulp.series( 
  build, 
  gulp.parallel(watch, browserSyncServer)
);


/*
 * Deploy To gitHubPages
 *
 * Serve the deployable folder watch for changes and start a dev server
 */

export function githubPages() {
  return gulp.src([paths.appRoot.dest + '**/*.*', paths.appRoot.dest + 'CNAME'])
    .pipe($.ghPages());
}


const deploy = gulp.series(
    build,
    copyRootFiles,
    githubPages
);




/* Export const functions */
export { build, serve, deploy};

/* Default gulp task as serve*/
export default serve;
