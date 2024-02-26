var path = require('path');
var webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

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
  externals: [
    nodeExternals({}),
  ],
  module: {
      rules: [
          {
              test: /\.js$/,
              loader: 'babel-loader',
              options: {
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
        	        limit: 8192,
                  esModule: false,
        	      },
        	    },
        	  ],
          }
      ]
  },
  devtool: 'source-map'
};
