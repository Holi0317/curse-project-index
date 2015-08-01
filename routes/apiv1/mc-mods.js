var express = require('express');
var Fuse = require('fuse.js');
var router = express.Router();
var models = require('../../models');

Array.prototype.contains = function(element){
  return this.indexOf(element) > -1;
};

router.use(function (req, res, next) {
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
  var sortMapper = {
    fancyname: 'fancyName',
    id: 'id_',
    author: 'author',
    downloadcount: '-downloadCount',
    score: 'score'  // Would not sort anything in database
  };

  var parm = {
    sort: (req.query.sort) ? req.query.sort: 'downloadCount',
    limit: (req.query.limit === 'all') ? Number.MAX_SAFE_INTEGER-1: req.query.limit,
    search: (req.query.search) ? req.query.search: '',
    threshold: (req.query.threshold) ? Number(req.query.threshold): 0.6,
  };
  var needFuse;

  // Section: Validicate
  // Validicate limit parm
  if (!parm.limit) {
    // undefined
    parm.limit = 10;
  } else if (isNaN(parm.limit)) {
    // Not a number nor 'all'
    res.status(400).json({
      'message': 'Incorrect limit parameter. Only "all", undefined and Number larger than 0 is accepted'
    });
    return;
  } else if (parm.limit < 1) {
    // Less than 1. Kidding?
    res.status(400).json({
      'message': 'How can I give you less than 1 data?'
    });
    return;
  }

  // Validicate sort parameter
  if (typeof sortMapper[parm.sort.toLowerCase()] === 'undefined') {
    // Key not in sortMapper. Incorrect parameter
    res.status(400).json({
      'message': 'Incorrect sort parameter.'
    });
    return;
  } else {
    parm.sort = sortMapper[parm.sort.toLowerCase()];
  }

  // Query parm
  if (!parm.search) {
    // Undefined
    needFuse = false;
  } else if (parm.search > 32) {
    res.status(400).json({
      'message': 'Search string length must be less than 32. #Blame fuse.js'
    });
    return;
  } else {
    // Requires fuse to search
    needFuse = true;
    parm.limit = Number.MAX_SAFE_INTEGER-1;
  }

  // threshold
  if (isNaN(parm.threshold) || parm.threshold < 0 || parm.threshold > 1) {
    res.status(400).json({
      'message': 'Threshold should be an number between 0 and 1'
    });
    return;
  }

  // Section: query and return
  models['mc-mods']
  .find({})
  .sort(parm.sort)
  .limit(parm.limit)
  .select('-_id id_ slug fancyName description author downloadCount tags')
  .exec(function (err, results) {
    if (err) {
      console.error('Error when querying mc-mods. Error: ', err);
      res.status(500).json({'message': 'Query error. See server log for details'});
      return;
    }

    if (needFuse) {
      var fuse = new Fuse(results, {
        keys: ['fancyName'],
        threshold: parm.threshold,
        shouldSort: parm.sort === 'score',
      });
      res.json(fuse.search(parm.search).slice(0, parm.limit));
    } else {
      res.json(results);
    }
  });

});

// List all tags
router.get('/tags', function (req, res, next) {
  models.info
  .findOne({})
  .select('tags')
  .exec(function (err, data) {
    if (err) {
      res.status(500).json({'message': 'Query error. See server log for details'});
      console.error('Error when querying tags. Error: ', err);
      return;
    }
    res.json(data.tags);
  });
});


module.exports = router;
