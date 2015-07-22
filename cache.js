var fs = require('fs');
var path = require('path');
var nodeCache = require('node-cache');

var cache = new nodeCache();

function reloadCache() {
  var files = ['mc-mods.json', 'info.json', 'mc-tags.json'];

  files.forEach(function (fileName) {
    fs.readFile(path.join(__dirname, 'data', fileName), function (err, data) {
      if (err) console.error('Error when reloading cache: ', err);
      try {
        cache.set(fileName.slice(0, -5), JSON.parse(data));
      } catch (e) {
        console.warn('Error when reloading cache: ', err);
      }

    });
  });
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

fs.readdir(path.join(__dirname, 'data'), function (err, files) {
  if (err) throw err;
  files.forEach(function (file) {
    if ( endsWith(file, '.json') ) {
      fs.watch(path.join(__dirname, 'data', file), reloadCache);
    }
  });
});

reloadCache();

module.exports = cache;
