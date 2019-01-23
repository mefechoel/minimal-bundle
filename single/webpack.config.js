/* eslint-disable camelcase */
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ScriptExtHtmlPlugin = require('script-ext-html-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
const webpack = require('webpack');
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const safePostCssParser = require('postcss-safe-parser');
const BrotliPlugin = require('brotli-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const manifest = require('./src/manifest');

// Find the legacyPolyfill chunk
const legacyPolyfillRegex = /(\w|\W)*legacyPolyfill\.(\w|\W)*\.js/;

// Compress all text based files
const compOptions = {
  test: /\.(js|css|html|svg)$/,
  // When filesize is below a certain size the cost of decompressing
  // the file is higher than the saving in transfer time
  threshold: 10240,
};

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';
  const isProd = argv.mode === 'production';

  return {
    mode: isProd ? 'production' : 'development',
    // Create seperate bundles for each part we need to make the app
    // as compatible with all browsers as possible
    entry: {
      // RegeneratorRuntime will be needed by all browsers to execute
      // transpiles async/await
      runtime: './runtime/index.js',
      // Legacy polyfills are packaged in a seperate bundle because they are
      // only needed by legacy browsers. They will be loaded with a script tag
      // with the 'nomodule' attribute, so modern browsers won't download
      // the bundle
      legacyPolyfill: './legacyPolyfill/index.js',
      // Modern polyfills will be needed by every browser to support es>6
      // features, like requestIdleCallback, which are not widely supported,
      // yet. This bundle will be very small, though, and won't bloat your
      // application size. Maybe you won't need it at all
      modernPolyfill: './modernPolyfill/index.js',
      // Main bundle
      main: './src/index.js',
    },
    devtool: isDev ? 'source-map' : false,
    devServer: {
      contentBase: './dist',
      port: 8080,
      // Logging will be done by FriendlyErrorsPlugin
      quiet: true,
    },
    module: {
      rules: [{
        // Show eslint warnings in build and in browser console
        enforce: 'pre',
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'eslint-loader',
        options: {
          formatter: require('eslint-formatter-friendly'),
          emitWarning: true,
        },
      }, {
        test: /\.js$/,
        use: [{
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env', {
              targets: {
                browsers: [
                  '> 1%',
                  'not dead',
                ],
              },
            }]],
            // Support for dynamic imports
            plugins: ['@babel/plugin-syntax-dynamic-import'],
          },
        }],
      }, {
        // Include and compile and prefix .sass files
        test: /\.sass$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'resolve-url-loader',
          'postcss-loader',
          'sass-loader',
        ],
      }, {
        // Include and prefix .css files
        test: /\.css$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'resolve-url-loader',
          'postcss-loader',
        ],
      }, {
        // Load fonts
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        exclude: /node_modules/,
        loader: 'file-loader',
        options: {
          name: 'assets/[name].[hash].[ext]',
        },
      }],
    },
    plugins: [
      // More readable webpack output on dev builds
      new FriendlyErrorsPlugin(),
      // Remove old build folder before build
      ...(!isDev ? [new CleanWebpackPlugin(['dist'])] : []),
      // Use template html and minify output
      new HtmlWebpackPlugin({
        template: 'public/index.html',
        minify: isProd
          ? {
            removeComments: true,
            collapseWhitespace: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeStyleLinkTypeAttributes: true,
            keepClosingSlash: true,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true,
          }
          : false,
      }),
      // Set 'nomodule' attribute on legacyPolyfill script tag,
      // so newer browsers, which do not need the legacy polyfills,
      // won't download the script
      new ScriptExtHtmlPlugin({
        custom: {
          test: legacyPolyfillRegex,
          attribute: 'nomodule',
        },
      }),
      // Generate manifest file
      new WebpackPwaManifest(manifest),
      // Extract css files into one css bundle
      new MiniCssExtractPlugin({
        filename: isDev
          ? 'styles/[name].bundle.css'
          : 'styles/[name].[contenthash].bundle.css',
        chunkFilename: isDev
          ? 'styles/[name].chunk.css'
          : 'styles/[name].[contenthash].chunk.css',
      }),
      // Compress text files
      new BrotliPlugin(compOptions),
      new CompressionPlugin(compOptions),
      ...(isDev ? [new webpack.HotModuleReplacementPlugin()] : []),
      // Get an overview of all scripts and libraries
      // and their sizes in your bundle
      new BundleAnalyzerPlugin({
        analyzerMode: isDev ? 'server' : 'static',
        analyzerPort: 8081,
        openAnalyzer: false,
        reportFilename: '../../dist/reports/bundlesize.html',
      }),
    ],
    optimization: {
      minimize: isProd,
      // Pull libraries out into seperate chunks for better caching
      splitChunks: {
        // Do not split polyfill and regeneratorRuntime libraries
        // out of scripts, since they will likely not change
        chunks: ({ name }) => (
          name !== 'legacyPolyfill' &&
          name !== 'modernPolyfill' &&
          name !== 'runtime'
        ),
      },
      minimizer: [
        // Minify js files
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
              passes: 3,
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true,
            },
          },
          parallel: true,
          cache: true,
          sourceMap: isDev,
        }),
        // Minify css files
        new OptimizeCSSAssetsPlugin({
          cssProcessorOptions: {
            parser: safePostCssParser,
            map: isDev,
          },
        }),
      ],
    },
    output: {
      filename: isDev
        // Don't hash file in development mode for better build performance
        ? 'js/[name].bundle.js'
        // Hash files in production for better caching
        : 'js/[name].[chunkhash].bundle.js',
      chunkFilename: isDev
        ? 'js/[name].chunk.js'
        : 'js/[name].[chunkhash].chunk.js',
      path: path.resolve(__dirname, './dist/static'),
    },
  };
};
