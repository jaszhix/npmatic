// Load modules
const webpack = require('webpack');
const webpackTargetElectronRenderer = require('webpack-target-electron-renderer');
const path = require('path');

// Load base config
const baseConfig = require('./webpack.config.base');

// Create the config
const config = Object.create(baseConfig);

// Set entry points
config.entry = [
  path.join(__dirname, '/app/index.js')
];

// Set output
config.output.publicPath = path.join(__dirname, '/dist/');

// Dev plugins
config.plugins.push(
  new webpack.optimize.UglifyJsPlugin({
    sourceMap: false,
    compress: {
      warnings: false,
      drop_console: true,
      dead_code: true,
      unused: true,
      booleans: true,
      join_vars: true,
      negate_iife: true,
      sequences: true,
      properties: true,
      evaluate: true,
      loops: true,
      if_return: true,
      cascade: true,
      unsafe: true
    },
    output: {
      comments: false
    }
  }),
  new webpack.optimize.OccurenceOrderPlugin(),
  new webpack.DefinePlugin({
    'process.env': {
       NODE_ENV: JSON.stringify('production')
     }
  })
);

// Specify Electron renderer
config.target = webpackTargetElectronRenderer(config);

// Export module
module.exports = config;