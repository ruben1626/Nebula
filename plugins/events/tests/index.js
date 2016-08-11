"use strict";

const fs = require('fs');
const path = require('path');

const mock = require('mock-fs');

require('./common.js').globalCheck = false;

try {
  console.log = function () {};
  console.error = function () {};

  ['custom', 'node_parallel'].forEach(function (dir) {
    let fsSandbox = mock.curSandbox;
    mock.restore();
    let fileNames = fs.readdirSync(path.join(__dirname, dir));
    mock(fsSandbox);
    fileNames.forEach(function (basename) {
      if (basename === 'index.js' || basename.slice(-3) !== '.js') return;
      require('./' + dir + '/' + basename);
    });
  });
} finally {
  delete console.log;
  delete console.error;
}
