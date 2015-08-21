var express = require('express');
var router = express.Router();

var tags = require('./apiv1/tags');
var mcMods = require('./apiv1/mc-mods');

// API version 1
router.get('/', function(req, res, next) {
  res.json({
    'version': '1.1.1'
  });
});

router.get('/v1', function (req, res, next) {
  res.json({
    'version': '1.1.1',
    'departed': false
  });
});

router.use('/v1/tags', tags);
router.use('/v1/mc-mods', mcMods);

module.exports = router;
