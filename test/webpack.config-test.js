var nodeExternals = require('webpack-node-externals');
var path = require('path');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")

module.exports = {
  mode: 'development',
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
      {
        test: /\.js$/,
        loader: 'babel-loader',
        options: {
          plugins: ['babel-plugin-istanbul'],
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
            }]
          ]
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
  devtool: "inline-cheap-module-source-map",
  plugins: [
    new NodePolyfillPlugin()
  ]
};
