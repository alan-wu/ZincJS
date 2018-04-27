var path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: {
    "zinc": "./js/zinc/zinc.js",
    "zinc.min": "./js/zinc/zinc.js",
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: "[name].js",
    library: 'Zinc',
    libraryTarget: 'umd'
  },
  plugins: [
    new UglifyJsPlugin({
      include: /\.min\.js$/,
      uglifyOptions: {
        compress: true
      }
    })
  ],
  externals: {
    three: {
      commonjs: 'THREE',
      commonjs2: 'THREE',
      amd: 'THREE',
      root: 'THREE'
    }
  }
};
