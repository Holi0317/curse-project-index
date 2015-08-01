'use strict';

var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var format = require('string-format');
var models = require('./models');

format.extend(String.prototype);

if (mongoose.connection.readyState === 0) {
  // Database is not connecting nor connected, connect to database here
  mongoose.connect('mongodb://localhost/curse');
  mongoose.connection.on('error', function (err) {throw err;});
  mongoose.connection.once('open', function () {
    console.log('Database connected');
  });
}

var url = 'http://minecraft.curseforge.com/{scope}?page={page}';

var mods = [];
var tags;

function range(lowEnd, highEnd) {
  var arr = [];
  while(lowEnd <= highEnd){
    arr.push(lowEnd++);
  }
  return arr;
}

function ParseList(scope) {
  /*
  * Parse curseforge.com list content and write to database
  * Invoke `this.call` using async.each to kick start
  * @param (String)scope: Scope for calling
  */
  this._scope = scope;
  return function (pageNum, callback) {
    /*
    * Handler for async.each
    * @param (Number)pageNum: target page number.
    * @param (Function)callback: callback
    */
    var self = this;
    request(url.format({scope:self._scope, page:pageNum}), function (error, response, body) {

      if (error) {
        console.error('Error when requesting url ', url.format({scope:self._scope, page:pageNum}));
        throw error;
      }

      function each(index, element) {
        var doc = _parseList(element);
        if (!doc) {
          // Parse got some error. Ignore it as it happens overtime.
          return;
        }
        models[self._scope].create(doc, function (error) {
          if (error) throw error;
        });
      }

      var $ = cheerio.load(body);
      // console.log(self);
      $('li.project-list-item div.details').each(each);
      callback();

    });
  }.bind(this);
}

function _parseList(body) {
  /*
  * Real parser for one project div
  * @param body: A DOM element (a.k.a non-$()-ed object) pointing to the div
  */
  var $ = cheerio(body);
  var result;
  try {
    var slugAndId = $.find('div.info.name > a').attr('href').split('/').slice(-1)[0].split('-');
    return {
      fancyName: $.find('div.info.name > a').text(),
      id_: slugAndId.shift(),
      slug: slugAndId.join('-'),
      description: $.find('div.description p').text(),
      author: $.find('div.info.name > span > a').text(),
      downloadCount: $.find('div.info.stats > span').first().text().replace(/,/g, ''),
      tags: $.find('div.categories-box a').map(function () {
        return cheerio(this).attr('href').split('/').slice(1).join('/');
      }).get(),
    };
  } catch (e) {
    // Sometimes, curseforge did not render project details. This cause .split() fail and throw error.
    console.error('When parsing list, got the following error: ', e);
  }
}

function getTags(body) {
  /*
  * Parse curseforge.com tags and return it as an array of Objects
  * @parm body: html content fetched from minecraft.curseforge.com/mc-mods
  * @return (object) Tags. contains url:name. If the tag has sub-tag, an array will be returned
  * The url will be like mc-addons/blood-magic or adventure-rpg
  */
  var $ = cheerio.load(body);
  var result = {};
  $('ul.listing ul a.level-categories-text').each(function () {
    var link = cheerio(this).attr('href').split('/');
    var name = cheerio(this).text();
    result[name] = link.slice(2).join('/');
  });
  return result;
}

function getLength(body) {
  var $ = cheerio.load(body);
  try {
    return $('.listing-header ul.b-pagination-list li:nth-last-child(2) > a').text();
  } catch (e) {
    console.error('Something got wrong when getting length.');
    throw e;
  }
}

function cleanDB(collections, callback) {
  /*
  * Clean collections from database
  * @param (Array of string)collection: Collections to be dropped.
  * @param (Function)callback: optional, call when error occured or finished
  */
  function dropCollection(collection, callback) {
    /*
    * Drop selected collection.
    * This does not check if schema is present. Please do test before commiting.
    * @param (String)collection: collection to be dropped.
    * @param (Function)callback: callback method when job is finished or failed.
    * Callback will be called with error if error occured.
    */
    models[collection].remove({}, function (err) {
      if (err) {
        console.error('Got error when dropping collection ',collection,' . Error: ', err);
        callback(err);
        return;
      }
      console.log('Dropped collection ', collection);
      callback(null);
    });
  }

  // Make a no-op callback if callback is undefined
  if (!callback) callback = function(){};

  async.each(collections, dropCollection, callback);

}

function fetchScope(scope, callback) {
  /*
  * Fetch tags, projects from scope and write to database
  * @param (String)scope: scope to be fetched
  * @param (Function)callback: callback
  */
  console.log('Started scope ', scope);

  // Request first page
  request(url.format({scope:scope, page:1}), function (error, response, body) {
    if (error) {
      console.warn('Got error when processing page 1 of ', scope, '. Error: ', error );
      throw error;
    }

    async.parallel([

      // Get tags and write to database
      function (callback) {
        models.tags.create({
          scope: scope,
          tags: getTags(body),
        }, function (error) {
          if (error) throw error;
          console.log('Fetched tags for scope ', scope);
          callback(null);
        });
      },

      // Get list projects
      function (callback) {
        var length = getLength(body);
        var parser = new ParseList(scope);
        async.each(range(1, length), parser.bind(parser), function (err) {
          if (err) {
            return console.warn('Got error when requesting page. ' + err);
          }
          console.log('Finished scope ', scope);
          callback(null);
        });
      },

    ], callback);
  });

}

function main() {
  console.log('Cron job started.');

  async.series([
    function (callback) {
      cleanDB(['mc-mods', 'info', 'tags'], callback);
    },
    function (callback) {
      async.each(['mc-mods'], fetchScope, callback);
    },
    function (callback) {
      // Last update
      models.info.create({}, function (err) {
        if (err) throw err;
        callback();
      });
    },
    function (callback) {
      console.log('Cron job finished');
      callback();
    }
  ]);
}

module.exports = main;

if (require.main === module) {
    main();
}
