"use strict";

var express = require('express');
var Fuse = require('fuse.js');
var async = require('async');
var router = express.Router();
var models = require('../../models');

function deserializeQuery(query) {
  /*
  * Deserialize query string
  * @param (Object) query: Raw query object from client

  * @return (Object): deserialized query object, with following keys
  * (Object) find - JSON doc for querying mongodb
  * (String) fuseSearch - String to be searched by fuse.js
  * (Number) threshold - threshold for fuse.js
  * (String) sort - mongodb query parameter
  * (Number) limit - mongodb query parameter
  * (Bool) needFuse - Require fuse.js to search?

  * @throw (String): Error in parameter. Response it with HTTP status 400 and in json
  */
  var sortTarget;
  var sortMapper = {
    fancyname: 'fancyName',
    id: 'id_',
    author: 'author',
    downloadcount: '-downloadCount',
    score: 'score'  // Would not sort anything in database level
  };

  var result = {
    find: {},
    fuseSearch: (query.search) ? query.search: '',
    threshold: 0.6,
    sort: '-downloadCount',
    limit: 10,
    needFuse: false,
  };

  // Section: Validicate
  // Validicate limit parm

  if (typeof query.limit === 'undefined') {
    // Remains default, 10
  } else if (query.limit.toLowerCase() === 'all') {
    result.limit = Number.MAX_SAFE_INTEGER-1;
  } else if (query.limit < 1) {
    throw 'How can I give you less than 1 data?';
  } else if (query.limit > Number.MAX_SAFE_INTEGER-1) {
    throw 'Limit parameter cannot be larger than 9007199254740990';
  } else if (!isNaN(query.limit)) {
    result.limit = Number(query.limit);
  } else {
    throw 'Incorrect limit parameter. Only "all", undefined and Number larger than 0 is accepted';
  }

  // Validicate sort parameter
  if (typeof query.sort !== 'undefined') {
    sortTarget = sortMapper[query.sort.toLowerCase()];
    if (typeof sortTarget === 'undefined') {
      throw 'Incorrect sort parameter.';
    } else {
      result.sort = sortTarget;
    }
  }

  // Query parameter
  if (!query.search) {
    // Does not need to search
  } else if (query.search.length > 32) {
    throw 'Search string length must be less than 32. #Blame fuse.js';
  } else {
    // Requires fuse to search
    result.needFuse = true;
    result.find.fancyName = new RegExp('^'+query.search[0], 'i');
    result.limit = Number.MAX_SAFE_INTEGER-1;
  }

  // threshold
  if (typeof query.threshold === 'undefined') {
    // Remains default
  } else if (isNaN(query.threshold) || query.threshold < 0 || query.threshold > 1) {
    throw 'Threshold should be an number between 0 and 1';
  } else {
    result.threshold = Number(query.threshold);
  }

  return result;
}

router.use(function (req, res, next) {
  // Inject header Last-Modified to response
  models.info
  .findOne({})
  .select('lastUpdate')
  .exec(function (err, data) {
    if (err) {
      res.status(500).json({'message': 'Query error. See server log for details'});
      console.error('Error when querying tags. Error: ', err);
      return;
    }
    res.set('Last-Modified', data.lastUpdate.toISOString());
    next();
  });
});

router.head('/', function (req, res, next) {
  models['mc-mods']
  .count({})
  .exec(function (err, count) {
    if (err) {
      res.status(500);
      console.error('Error when counting. Error: ', err);
      return;
    }
    res.set('X-length', count);
    res.send('');
  });
});

router.get('/', function (req, res, next) {
  /*
  * The master plan: validicate and format params. -> Query and sort from mongo.
  * -> Create fuse object. -> search and return.
  */
  var query;

  try {
    query = deserializeQuery(req.query);
  } catch (err) {
    return res.status(400).json({
      message: err
    });
  }

  // Section: query and return
  try {
    models['mc-mods']
    .find(query.find)
    .sort(query.sort)
    .limit(query.limit)
    .select('-_id id_ slug fancyName description author downloadCount tags')
    .exec(function (err, results) {
      if (err) throw err;

      if (query.needFuse) {
        var fuse = new Fuse(results, {
          keys: ['fancyName'],
          threshold: query.threshold,
          shouldSort: query.sort === 'score',
        });
        var fuseAsync = async.asyncify(fuse.search.bind(fuse));
        fuseAsync(query.fuseSearch, function (error, result) {
          if (err) throw err;
          return res.json(result);
        });
      } else {
        return res.json(results);
      }
    });
  } catch (err) {
    console.error('Error when querying database. Error: ', err);
    res.status(500).json({
      message: 'Query error. Check server log for details'
    });
    return;
  }

});


module.exports = router;
