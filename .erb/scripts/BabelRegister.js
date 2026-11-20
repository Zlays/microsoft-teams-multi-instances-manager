const path = require('path');

require('@babel/register')({
  extensions: ['.es6', '.es', '.jsx', '.js', '.mjs', '.ts', '.tsx'],
  cwd: path.join(__dirname, '../..'),
  configFile: path.join(__dirname, '../configs/babel.config.js'),
});
