const webpack = require('webpack');
const path = require('path');

const config = {
  entry: [
    path.join(__dirname, '/app/index.js')
  ],
  output: {
    path: path.join(__dirname, '/dist'),
    filename: 'bundle.js'
  },
  module: {
    loaders: [{
      test: /\.css$/,
      loader: 'style-loader!css-loader'
    }, {
      test: /\.scss$/,
      loaders: ['style', 'css?modules', 'postcss', 'sass']
    }, {
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      loaders: ['babel']
    }, {
      test: /\.html$/,
      loaders: ['html']
    }, {
      test: /\.json$/,
      loaders: ['json']
    }, {
      test: /\.(png|jpg|gif)$/,
      loader: 'file-loader?name=[hash].[ext]'
    }, ]
  },
  postcss: function () {
    return [
      require('autoprefixer')
    ];
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery'
    })
  ]
};

module.exports = config;