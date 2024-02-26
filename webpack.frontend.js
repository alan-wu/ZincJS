var path = require('path');
var webpack = require('webpack');

module.exports = {
  mode: "production",
  entry: {
    "zinc": "./src/zinc.js"
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: "[name].frontend.js",
    library: 'Zinc',
    libraryTarget: 'umd',
    globalObject: 'this'

  },
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
