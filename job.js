var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var path = require('path');
var soundex = require('soundex-encode');
var mongoose = require('mongoose');
var models = require('./models');

if (mongoose.connection.readyState === 0) {
  // Database is not connecting nor connected, connect to database here
  mongoose.connect('mongodb://localhost/curse');
  mongoose.connection.on('error', function (err) {throw err;});
  mongoose.connection.once('open', function () {
    console.log('Database connected');
  });
}

var url = 'http://minecraft.curseforge.com/mc-mods?page=';

var mods = [];
var tags;

function parseList(body) {
  /*
  * Parse curseforge.com list content and directly append to mods
  * @parm body: html content fetched from minecraft.curseforge.com/mc-mods
  */
  var $ = cheerio.load(body);
  $('li.project-list-item div.details').each(function () {
    try {
      var $ = cheerio(this);
      var slugAndId = $.find('div.info.name > a').attr('href').split('/').slice(-1)[0].split('-');
      models['mc-mods'].create({
        fancyName: $.find('div.info.name > a').text(),
        fancyNameSoundex: soundex($.find('div.info.name > a').text()),
        fancyNameFlatten: $.find('div.info.name > a').text().replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
        id_: slugAndId.shift(),
        slug: slugAndId.join('-'),
        description: $.find('div.description p').text(),
        author: $.find('div.info.name > span > a').text(),
        downloadCount: $.find('div.info.stats > span').first().text().replace(/,/g, ''),
        tags: $.find('div.categories-box a').map(function () {
          return cheerio(this).attr('href').split('/').slice(1).join('/');
        }).get(),
      }, function (err) {
        if (err) throw err;
      });
    } catch (e) {
      console.error('When parsing list, got the following error: ', e);
    }
  });
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

function eachUrl(pageNum, callback) {
  // Handler for each page number
  request(url + pageNum, function (error, response, body) {
    parseList(body);
    callback();
    return;
  });
}

module.exports = function () {
  console.log('Cron job started.');
  request(url + '1', function (error, response, body) {
    if (error) {
      console.warn('Got error when requesting page. ', error );
      throw error;
    }
    async.series([
      function (callback) {
        // Drop mc-mods collection
        models['mc-mods'].remove({}, function (err) {
          if (err) {
            console.error('Got error when dropping all mc-mods. Error: ', err);
            throw err;
          }
          console.log('dropped all data');
          callback(null);
        });
      },
      function (callback) {
        // Drop info collection
        models.info.remove({}, function (err) {
          if (err) {
            console.error('Got error when dropping all mc-mods. Error: ', err);
            throw err;
          }
          console.log('dropped all info');
          callback(null);
        });
      },
      function (callback) {
        // List tags
        models.info.create({
          tags: getTags(body),
        }, function (err) {
          if (err) throw err;
          console.log('Fetched all tags');
          callback(null);
        });
      },
      function (callback) {
        // Get length of the list
        var $ = cheerio.load(body);
        var length = $('.listing-header ul.b-pagination-list li:nth-last-child(2) > a').text();

        // List all mods
        var calls = [];

        parseList(body);

        // A.K.A. `calls = range(2, length)` in python
        for (var i = 2; i < length; i++) {
          calls.push(i);
        }

        async.each(calls, eachUrl, function (err) {
          if (err) {
            return console.warn('Got error when requesting page. ' + err);
          }

          console.log('Finished cron job');
          callback(null);

        });
      }
    ]);
  });
};
