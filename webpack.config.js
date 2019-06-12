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
                  presets: ['@babel/preset-env',
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
      ]
  },
  devtool: 'source-map'
};
