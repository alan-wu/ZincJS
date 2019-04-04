var path = require('path');
var webpack = require('webpack');

module.exports = {
  mode: "none",
  entry: {
    "zinc": "./src/zinc.js"
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: "[name].js",
    library: 'Zinc',
    libraryTarget: 'umd',
    globalObject: 'this'

  },
  module: {
      rules: [
          {
              test: /\.js$/,
              loader: 'babel-loader',
              query: {
                  presets: ['@babel/preset-env']
              }
          }
      ]
  },
  devtool: 'source-map'
};
