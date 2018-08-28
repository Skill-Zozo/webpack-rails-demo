'use strict'
/* eslint-env node */
/* eslint no-console: 0 */

const webpack = require('webpack')
const path = require('path')
const Happypack = require('happypack')
const happyThreadPool = Happypack.ThreadPool({ size: 6 })
const StatsPlugin = require('stats-webpack-plugin')
const WebpackMd5Hash = require('webpack-md5-hash')
const SentryPlugin = require('webpack-sentry-plugin')
const S3Plugin = require('webpack-s3-plugin')
const execSync = require('child_process').execSync

const devServerPort = 3808

const env = process.env.APP_ENV || process.env.FLUID_ENV || 'production'
const git = process.env.GIT_RELEASE || execSync('git rev-parse --short HEAD').toString().trim()
const prod = env === 'production'
const dev = env === 'development'
const appIp = process.env.PUBLIC_IP || '0.0.0.0'

const jsLoaders = ['babel-loader?cacheDirectory']
const jsonLoaders = ['json-loader']
const svgLoaders = ['babel-loader', 'react-svg-loader']

const team = process.env.ENVIRONMENT_TEAM_NAME,
    app_namespace = (team ? `reports/${team}` : `reports/main`) + "/webpack",
    remote_assets_host = "https://assets."  + (prod ? "zappi.io/" : `${env}.zappi.io/`) + app_namespace + "/"

const outputDir = path.join(process.cwd(), 'public', app_namespace)

const getEnvPlugins = () => dev
    ? [
        new Happypack({ id: 'js', verbose: false, threadPool: happyThreadPool, loaders: jsLoaders }),
        new Happypack({ id: 'json', verbose: false, threadPool: happyThreadPool, loaders: jsonLoaders }),
        new Happypack({ id: 'svg', verbose: false, threadPool: happyThreadPool, loaders: svgLoaders })
    ]
    : [
        new WebpackMd5Hash(),
        new webpack.optimize.UglifyJsPlugin({
            compressor: { warnings: false },
            output: { comments: false },
            sourceMap: true  // map errors to source
        }),
        new S3Plugin({
          s3Options: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: 'us-east-1'
          },
          s3UploadOptions: {
            Bucket: `zappi-assets-${env}`
          },
          basePath: app_namespace
        })
    ]

const getEnvEntries = () => {
    if (dev) return [
        `webpack-dev-server/client?http://${appIp}:${devServerPort}`,
    ]
    else return []
}

module.exports = {
    entry: {
        application: getEnvEntries().concat([
            path.join(process.cwd(), 'webpack', 'application.js')
        ])
    },
    // Output file - where to create the bundle
    output: {
        path: outputDir,
        filename: prod ? '[name]-[chunkhash].js' : '[name].js',
        chunkFilename: prod ? 'chunks/[name]-[chunkhash].js' : 'chunks/[name].js',
        publicPath: dev ? `//${appIp}:${devServerPort}/${app_namespace}/` : remote_assets_host,
        pathinfo: true
    },
    devServer: prod ? {} : {
        contentBase: outputDir,
        port: devServerPort,
        host: '0.0.0.0',
        headers: { 'Access-Control-Allow-Origin': '*' },
        // stats: 'minimal',
        stats: {
            colors: true,
            hash: false,
            version: true,
            timings: true,
            assets: true,
            children: false,
            chunks: false,
            modules: false,
            reasons: true,
            source: false,
            errors: true,
            errorDetails: false,
            warnings: prod,
            publicPath: false
        }
    },
    // Suppress performance hints in development, since we're serving unminified code
    performance: {
        hints: false,
    },
    resolve: {
        modules: [
            'node_modules',
            'node_modules/@io/fluid3.engine/source'
        ],
        symlinks: false
    },
    resolveLoader: {
        // Resolve Webpack loaders from the following locations
        modules: [
            path.join(process.cwd(), 'node_modules'),
            // 'node_modules'
        ],
        symlinks: false
    },
    externals: [
        // External dependencies, i.e dependencies of the bundle.
        // They have to be added in the source/template/index.html from CDN or local files
        'babel-polyfill'
    ],
    module: {
        // Which loaders to use when compiling the source
        loaders: [
            // Babel-loader compiles ES2015 and JSX syntax - see 'babel' section in package.json
            {
                test: /\.js$/,
                include: [
                    /webpack\/zappi/,
                    /fluid3\.engine\/source/
                ],
                loaders: !dev ? jsLoaders : ['happypack/loader?id=js']
            },
            {
                test: /\.json$/,
                loaders: !dev ? jsonLoaders : ['happypack/loader?id=json']
            },
            // SASS compilation
            {
                test: /\.scss$/,
                loaders: ['style-loader', 'css-loader', 'sass-loader']
            },
            // CSS modules
            {
                test: /\.css$/,
                loaders: ['style-loader', 'css-loader?modules&importLoaders=1&localIdentName=fluid__[local]__[hash:base64:5]!postcss-loader']
            },
            // Fonts
            {
                test: /\/fonts\/.*?\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
                loader: 'file-loader?name=[name].[ext]'
            },
            // Images
            {
                test: /\.(jpe?g|png|gif)$/i,
                loaders: [
                    'file-loader?hash=sha512&digest=hex&name=images/[hash].[ext]', {
                        loader: 'image-webpack-loader',
                        query: {
                            mozjpeg: {
                                progressive: true,
                            },
                            gifsicle: {
                                interlaced: false,
                            },
                            optipng: {
                                optimizationLevel: 4,
                            },
                            pngquant: {
                                quality: '75-90',
                                speed: 3,
                            },
                        },
                    }
                ]
            }
        ]
    },
    plugins: [
        new webpack.NoEmitOnErrorsPlugin(),
        new webpack.NamedModulesPlugin(),
        new StatsPlugin('manifest.json', {
          // We only need assetsByChunkName
          chunkModules: false,
          source: false,
          chunks: false,
          modules: false,
          assets: true
        })
    ].concat(getEnvPlugins()),
    // Create source-maps for the bundle
    devtool: 'source-map'
}
