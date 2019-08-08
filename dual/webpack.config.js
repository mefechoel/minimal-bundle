/* eslint-disable camelcase */
const path = require('path');
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
const Fiber = require('fibers');
const dartSass = require('sass');
const manifest = require('./src/manifest');

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
  const isLegacyBuild = process.env.LEGACY_BUILD === 'true' || isDev;

  const entryLegacy = {
    // RegeneratorRuntime will only be needed by legacy browsers to execute
    // transpiles async/await, since the modern bundle does not transpile
    // async/await
    runtime: './runtime/index.js',
    // Legacy polyfills to provide es6 functionality, that all modern browsers
    // support already.
    legacyPolyfill: './legacyPolyfill/index.js',
    // Modern polyfills will be needed by every browser to support es>6
    // features, like requestIdleCallback, which are not widely supported,
    // yet. This bundle will be very small, though, and won't bloat your
    // application size. Maybe you won't need it at all
    modernPolyfill: './modernPolyfill/index.js',
    // Main bundle, heavily transpiled
    main: './src/index.js',
  };

  const entryModern = {
    // We bundle the modern polyfills as well, so we can ship a near
    // untranspiled version for modern browsers. This does not really
    // make a difference to the bundle size in this case, but we'll do
    // it for consistency
    modernPolyfill: './modernPolyfill/index.js',
    // Main bundle, barely transpiled at all, since browsers, that support
    // modules also support most of es>=6
    main: './src/index.js',
  };

  const entry = isLegacyBuild ? entryLegacy : entryModern;

  const babelEnvTargetsLegacy = {
    browsers: ['> 1%', 'not dead'],
  };

  // Target browsers that support modules
  const babelEnvTargetsModern = {
    esmodules: true,
  };

  const babelEnvTargets = isLegacyBuild
    ? babelEnvTargetsLegacy
    : babelEnvTargetsModern;

  // Set 'nomodule' attribute on legacyPolyfill, runtime and
  // legacy main script tag, so newer browsers, which support
  // the polyfilled features and modern js syntax won't download
  // the scripts
  const scriptExtConfigLegacy = {
    custom: {
      test: isDev ? /(\w|\W)*legacyPolyfill\.?(\w|\W)*\.js/ : /(\w|\W)*\.js/,
      attribute: 'nomodule',
    },
  };

  // Add the module type to all modern bundles
  const scriptExtConfigModern = {
    module: /(\w|\W)*\.js/,
  };

  const scriptExtConfig = isLegacyBuild
    ? scriptExtConfigLegacy
    : scriptExtConfigModern;

  // Prefix bundles, so we can distinguish between the modern and
  // the legacy main bundle
  let prefix = isLegacyBuild ? 'legacy.' : 'modern.';
  if (isDev) prefix = '';

  return {
    mode: isProd ? 'production' : 'development',
    // Use legacy entry in first build, modern entry in second build
    entry,
    devtool: isDev ? 'source-map' : false,
    devServer: {
      contentBase: './dist',
      port: 8080,
      // Logging will be done by FriendlyErrorsPlugin
      quiet: true,
    },
    module: {
      rules: [
        {
          // Show eslint warnings in build and in browser console
          enforce: 'pre',
          test: /\.js$/,
          exclude: /node_modules/,
          loader: 'eslint-loader',
          options: {
            formatter: require('eslint-formatter-friendly'),
            emitWarning: true,
          },
        },
        {
          test: /\.js$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  [
                    '@babel/preset-env',
                    {
                      targets: babelEnvTargets,
                    },
                  ],
                ],
                // Support for dynamic imports
                plugins: ['@babel/plugin-syntax-dynamic-import'],
              },
            },
          ],
        },
        {
          // Include and compile and prefix .sass files
          test: /\.sass$/,
          use: [
            isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
            'css-loader',
            'resolve-url-loader',
            'postcss-loader',
            {
              loader: 'sass-loader',
              options: {
                implementation: dartSass,
                fiber: Fiber,
              },
            },
          ],
        },
        {
          // Include and prefix .css files
          test: /\.css$/,
          use: [
            isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
            'css-loader',
            'resolve-url-loader',
            'postcss-loader',
          ],
        },
        {
          // Load fonts
          test: /\.(eot|svg|ttf|woff|woff2)$/,
          exclude: /node_modules/,
          loader: 'file-loader',
          options: {
            name: 'assets/[name].[hash].[ext]',
          },
        },
      ],
    },
    plugins: [
      // More readable webpack output on dev builds
      new FriendlyErrorsPlugin(),
      // Use template html and minify output
      new HtmlWebpackPlugin({
        template: 'public/index.html',
        // Prefix html, so we can join the modern script tags
        // into the legay html
        filename: `${prefix}index.html`,
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
      new ScriptExtHtmlPlugin(scriptExtConfig),
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
        reportFilename: `../../dist/reports/${prefix}bundlesize.html`,
      }),
    ],
    optimization: {
      minimize: isProd,
      // Pull libraries out into seperate chunks for better caching
      splitChunks: {
        // Do not split polyfill and regeneratorRuntime libraries
        // out of scripts, since they will likely not change
        chunks: ({ name }) =>
          name !== 'legacyPolyfill' &&
          name !== 'modernPolyfill' &&
          name !== 'runtime',
      },
      minimizer: [
        // Minify js files
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 8,
            },
            compress: {
              // We can take advantage of new and shorter js syntax
              // when minifying the modern bundle
              ecma: isLegacyBuild ? 5 : 6,
              warnings: false,
              comparisons: false,
              inline: 2,
              passes: 3,
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: isLegacyBuild ? 5 : 6,
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
        ? // Don't hash file in development mode for better build performance
        `js/${prefix}[name].bundle.js`
        : // Hash files in production for better caching
        `js/${prefix}[name].[contenthash].bundle.js`,
      chunkFilename: isDev
        ? `js/${prefix}[name].chunk.js`
        : `js/${prefix}[name].[contenthash].chunk.js`,
      path: path.resolve(__dirname, './dist/static'),
    },
  };
};
