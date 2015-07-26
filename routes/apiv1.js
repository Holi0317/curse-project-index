var express = require('express');
var soundex = require('soundex-encode');
var fuse = require('fuse.js');
var router = express.Router();
var models = require('../models');

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
  var queryParm = {};
  var sortMapper = {
    fancyname: 'fancyName',
    id: 'id_',
    author: 'author',
    downloadcount: 'downloadCount',
    score: 'score'  // Would not sort anything in database
  };

  var parm = {
    page: (req.query.page) ? Number(req.query.page): 1,
    sort: (req.query.sort) ? String(req.query.sort): 'downloadCount',
    limit: (req.query.limit === 'all') ? Number.MAX_SAFE_INTEGER-1: req.query.limit,
    search: (req.query.search) ?  req.query.search: '',
    soundex: (req.query.soundex) ? true: false,
    sortBy: {}
  };

  // Section: Validicate
  // Validicate limit parm
  if (!parm.limit) {
    parm.limit = 10;
  } else if (isNaN(parm.limit)) {
    res.status(400).json({
      'message': 'Incorrect limit parameter. Only "all", undefined and Number larger than 0 is accepted'
    });
    return;
  } else if (parm.limit < 1) {
    res.status(400).json({
      'message': 'How can I give you less than 1 data?'
    });
    return;
  }

  // Validicate sort parameter
  if (typeof sortMapper[parm.sort.toLowerCase()] === 'undefined') {
    res.status(400).json({
      'message': 'Incorrect sort parameter.'
    });
    return;
  } else {
    parm.sort = sortMapper[parm.sort.toLowerCase()];
  }

  // Validicate page
  if (isNaN(parm.page) || parm.page < 0) {
    res.status(400).json({
      'message': 'Incorrect page parameter. Only number that is larger than 0 and undefined is accepted.'
    });
    return;
  }

  // Query parm
  if (!parm.search) {
    // No-op
  } else if (parm.soundex) {
    queryParm.fancyNameSoundex = soundex(parm.search);
  } else {
    queryParm.fancyNameFlatten = {
      $regex: new RegExp(parm.search.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
    };
  }

  parm.sortBy[parm.sort] = -1;

  // Section: query and return
  models['mc-mods'].paginate(queryParm, {
    page: parm.page,
    limit: parm.limit,
    sortBy: parm.sortBy,
    columns: '-_id id_ slug fancyName fancyNameSoundex description author downloadCount tags',
  }, function (err, results, pageCount, itemCount) {
    if (err) {
      console.error('Error when querying mc-mods. Error: ', err);
      res.status(500).json({'message': 'Query error. See server log for details'});
      return;
    }
    res.set({
      'X-page-count': pageCount,
      'X-length': itemCount
    });
    if (parm.sort !== 'sort') res.json(results);
    else {
      res.json(new fuse(results, {
        keys: ["fancyName"],
        threshold: 1,
      }).search(parm.search));
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
