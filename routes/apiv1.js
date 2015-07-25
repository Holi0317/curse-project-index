var express = require('express');
var router = express.Router();
var models = require('../models');
var soundex = require('soundex-encode');

Array.prototype.contains = function(element){
  return this.indexOf(element) > -1;
};

router.get('/', function (req, res, next) {
  res.send();
});

// Last update
router.get('/info', function (req, res, next) {
  models.info
    .findOne({})
    .select('lastUpdate')
    .exec(function (err, data) {
      if (err) {
        res.status(500).json({'message': 'Query error. See server log for details'});
        console.error('Error when querying tags. Error: ', err);
        return;
      }
      res.json(data);
    });
});

// List and search cached mods
router.get('/list', function (req, res, next) {
  var parm = {
    page: (req.query.page) ? Number(req.query.page): 1,
    sort: (req.query.sort) ? String(req.query.sort): 'downloadCount',
    limit: (req.query.limit === 'all') ? Number.MAX_SAFE_INTEGER-1: req.query.limit,
    search: (req.query.search) ?  req.query.search: '',
    fuzzy: (req.query.fuzzy) ? true: false
  };
  var accepedSort = ['fancyName', 'slug', 'id_', 'description', 'author', 'downloadCount', 'tags'];
  var queryParm;
  var sortBy = {};

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
  if (!accepedSort.contains(parm.sort)) {
    res.status(400).json({
      'message': 'Incorrect sort parameter.'
    });
    return;
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
    queryParm = {};
  } else if (parm.fuzzy) {
    queryParm = {
        fancyNameSoundex: soundex(parm.search)
    };
  } else {
    queryParm = {
      fancyNameFlatten: {
        $regex: new RegExp(parm.search.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
      }
    };
  }

  sortBy[parm.sort] = -1;

  // Section: query and return
  models['mc-mods'].paginate(queryParm, {
    page: parm.page,
    limit: parm.limit,
    sortBy: {
      downloadCount: -1
    },
    // populate: ['id', 'slug', 'fancyName', 'fancyNameSoundex', 'description', 'author', 'downloadCount', 'tags']
  }, function (err, results, pageCount, itemCount) {
    if (err) {
      console.error('Error when querying mc-mods. Error: ', err);
      res.status(500).json({'message': 'Query error. See server log for details'});
      return;
    }
    res.json(results);
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
      res.json(data);
    });
});


module.exports = router;
