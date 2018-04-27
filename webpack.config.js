var path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: {
    "zinc": "./src/zinc.js",
    "zinc.min": "./src/zinc.js",
  },
  output: {
    path: path.resolve(__dirname, 'build'),
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
