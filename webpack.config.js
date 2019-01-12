/* eslint-disable camelcase */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ScriptExtHtmlPlugin = require('script-ext-html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const webpack = require('webpack');
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const BrotliPlugin = require('brotli-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const safePostCssParser = require('postcss-safe-parser');
const WebpackPwaManifest = require('webpack-pwa-manifest');

const polyfillRegex = /(\w|\W)*polyfill\.(\w|\W)*\.js/;

const compOptions = {
  test: /\.(js|css|html|svg)$/,
  threshold: 10240,
};

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';
  const isProd = argv.mode === 'production';

  return {
    mode: isProd ? 'production' : 'development',
    entry: {
      runtime: './runtime/index.js',
      polyfill: './polyfill/index.js',
      main: './src/index.js',
    },
    devtool: isDev ? 'source-map' : false,
    devServer: {
      contentBase: './dist',
      port: 8080,
      quiet: true,
    },
    module: {
      rules: [{
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
            plugins: ['@babel/plugin-syntax-dynamic-import'],
          },
        }],
      }, {
        test: /\.sass$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'resolve-url-loader',
          'postcss-loader',
          'sass-loader',
        ],
      }, {
        test: /\.css$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'resolve-url-loader',
          'postcss-loader',
        ],
      }, {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        exclude: /node_modules/,
        loader: 'file-loader',
        options: {
          name: 'assets/[name].[hash].[ext]',
        },
      }],
    },
    plugins: [
      new FriendlyErrorsPlugin(),
      new CleanWebpackPlugin(['dist']),
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
      new ScriptExtHtmlPlugin({
        custom: {
          test: polyfillRegex,
          attribute: 'nomodule',
        },
      }),
      new WebpackPwaManifest({
        name: 'Minimal Bundle',
        short_name: 'MiniBundle',
        description: 'This is a sample app for a minimal bundle size.',
        background_color: '#000000',
      }),
      new MiniCssExtractPlugin({
        filename: isDev
          ? 'styles/[name].bundle.css'
          : 'styles/[name].[contenthash].bundle.css',
        chunkFilename: isDev
          ? 'styles/[name].chunk.css'
          : 'styles/[name].[contenthash].chunk.css',
      }),
      new BrotliPlugin(compOptions),
      new CompressionPlugin(compOptions),
      ...(isDev ? [new webpack.HotModuleReplacementPlugin()] : []),
      new BundleAnalyzerPlugin({
        analyzerMode: isDev ? 'server' : 'static',
        analyzerPort: 8081,
        openAnalyzer: false,
        reportFilename: '../../dist/reports/bundlesize.html',
      }),
    ],
    optimization: {
      minimize: isProd,
      splitChunks: {
        chunks: ({ name }) => name !== 'polyfill' && name !== 'runtime',
      },
      minimizer: [
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
        ? 'js/[name].bundle.js'
        : 'js/[name].[chunkhash].bundle.js',
      chunkFilename: isDev
        ? 'js/[name].chunk.js'
        : 'js/[name].[chunkhash].chunk.js',
      path: path.resolve(__dirname, './dist/static'),
    },
  };
};
