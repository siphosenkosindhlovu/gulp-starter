import { src, dest, watch, series, parallel } from 'gulp';
import yargs from 'yargs';
import sass from 'gulp-sass';
import cleanCss from 'gulp-clean-css';
import gulpif from 'gulp-if';
import postcss from 'gulp-postcss';
import sourcemaps from 'gulp-sourcemaps';
import autoprefixer from 'autoprefixer';
import imagemin from 'gulp-imagemin';
import del from 'del';
import webpack from 'webpack-stream';
import named from 'vinyl-named';
import browserSync from 'browser-sync';
import zip from 'gulp-zip';
import info from './package.json';
import replace from 'gulp-replace';
import ejs from 'gulp-ejs';
import rename from 'gulp-rename';

const PRODUCTION = yargs.argv.prod;

const webpackConfig = {
	module: {
		rules: [
			{
				test: /\.js$/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [],
					},
				},
			},
		],
	},
	mode: PRODUCTION ? 'production' : 'development',
	devtool: ! PRODUCTION ? 'inline-source-map' : false,
	externals: {
		jquery: 'jQuery',
	},
	output: {
		filename: '[name].js',
	},
};

const server = browserSync.create();

export const serve = ( done ) => {
	server.init(
		{server: {
      baseDir: './dist/',
    },}
	);
	done();
};

export const reload = ( done ) => {
	server.reload();
	done();
};

export const styles = () => {
	return src( 'src/scss/style.scss' )
		.pipe( gulpif( ! PRODUCTION, sourcemaps.init() ) )
		.pipe( sass().on( 'error', sass.logError ) )
		.pipe( gulpif( PRODUCTION, postcss( [ autoprefixer ] ) ) )
		.pipe( gulpif( PRODUCTION, cleanCss( { compatibility: 'ie8' } ) ) )
		.pipe( gulpif( ! PRODUCTION, sourcemaps.write() ) )
		.pipe( dest( 'dist/css' ) )
		.pipe( server.stream() );
};

export const scripts = () => {
	return src( [
		'src/js/bundle.js',
	] )
		.pipe( named() )
		.pipe( webpack( webpackConfig ) )
		.pipe( dest( 'dist/js' ) );
};

export const pages = () => {
  return src(['src/ejs/*.ejs'])
    .pipe(ejs())
    .pipe(
      rename({
        extname: '.html',
      }),
    )
    .pipe(dest('dist'));
};

export const images = () => {
	return src( 'src/images/**/*.{jpg,jpeg,png,svg,gif}' )
		.pipe( gulpif( PRODUCTION, imagemin() ) )
		.pipe( dest( 'dist/images' ) );
};

export const copy = () => {
	return src( [
		'src/copy/**/*',
		'!src/{images,js,scss}',
		'!src/{images,js,scss}/**/*',
	] ).pipe( dest( 'dist' ) );
};

export const clean = () => del( [ 'dist' ] );

export const compress = () => {
	return src( [
		'dist/**/*',
		'!node_modules{,/**}',
		'!vendor{,/**}',
		'!bundled{,/**}',
		'!src{,/**}',
		'!.babelrc',
		'!.gitignore',
		'!gulpfile.babel.js',
		'!package.json',
		'!package-lock.json',
		'!composer.json',
		'!composer.lock',
		'!phpcs.xml.dist',
		'!yarn.lock',
		'!.vscode',
		'!.babelrc',
		'!.eslintrc',
		'!.prettierrc',
		'!.stylelintrc.json',
		'!.gitignore',
	] )
		.pipe(
			gulpif(
				( file ) => file.relative.split( '.' ).pop() !== 'zip',
				replace( '_themename', info.name )
			)
		)
		.pipe( zip( `${ info.name }.zip` ) )
		.pipe( dest( 'bundled' ) );
};

export const watchForChanges = () => {
	watch( 'src/ejs/**/*.ejs', pages ).on('change', server.reload);
	watch( 'src/scss/**/*.scss', styles );
	watch( 'src/images/**/*.{jpg,jpeg,png,svg,gif}', series( images, reload ) );
	watch(
		[ 'src/copy/**/*', '!src/{images,js,scss}', '!src/{images,js,scss}/**/*' ],
		copy
	);
	watch( 'src/js/**/*.js', series( scripts, reload ) );
};

export const dev = series(
	clean,
	parallel( styles, images, copy, scripts, pages ),
	serve,
	watchForChanges
);

export const pack = series(
	clean,
	parallel( styles, images, copy, scripts, pages ),
	compress
);
export const build = series(
	clean,
	parallel( styles, images, copy, scripts, pages ),
);

export default dev;
