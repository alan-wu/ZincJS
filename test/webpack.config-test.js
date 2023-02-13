var nodeExternals = require('webpack-node-externals');
var path = require('path');
var isCoverage = process.env.NODE_ENV === 'coverage';

module.exports = {
  mode: 'none',
  resolve: {
    modules: [path.resolve('../src'), "node_modules"],
    extensions: ['.ts', '.js'],
  },
  output: {
    // use absolute paths in sourcemaps (important for debugging via IDE)
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]'
  },
  module: {
    rules: [].concat(
      isCoverage ? {
        test: /\.(js|ts)/,
        include: path.resolve('../src'), // instrument only testing sources with Istanbul, after ts-loader runs
        exclude: /(node_modules|bower_components)/,
        loader: 'istanbul-instrumenter-loader',
        query: {
          esModules: true
        }
      }: [],
      {
        test: /\.js$/,
        loader: 'babel-loader',
        query: {
            presets: [
              [
                "@babel/preset-env",
                {
                  "targets": {
                    "esmodules": true
                  }
                }
              ],
              ['minify',  {
                builtIns: false,
                evaluate: false,
                mangle: false,
               }]]
        }
      },
      {
        test: /\.(gif|png|jpe?g|svg)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192
            },
          },
        ],
      }
    )
  },
  target: 'node',  // webpack should compile node compatible code
  externals: [nodeExternals()], // in order to ignore all modules in node_modules folder
  devtool: "inline-cheap-module-source-map"
};

