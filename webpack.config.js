const path = require('path');
const fs = require('fs');

const babelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '.babelrc')));

module.exports = {
  devtool: 'source-map',
  entry: './app/main.js',
  output: {
    filename: 'bundle.js'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /(node_modules)/,
      loader: 'babel',
      query: babelConfig
    }]
  }
};
