const path = require('path');
const fs = require('fs');
const babel = require('@babel/core');

// Compila src/preload.ts in src/preload.js
const preloadTs = path.join(__dirname, '../../src/preload.ts');
const preloadJs = path.join(__dirname, '../../src/preload.js');
const transformed = babel.transformFileSync(preloadTs, {
  configFile: path.join(__dirname, '../configs/babel.config.js'),
});
fs.writeFileSync(preloadJs, transformed.code, 'utf8');

require('./BabelRegister');
require(path.join(__dirname, '../../src/main.dev.ts'));
