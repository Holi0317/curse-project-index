var express = require('express');
var router = express.Router();
var models = require('../../models');

// target = scope in curseforge
router.get('/:scope', function(req, res, next) {
  models.tags
  .findOne({
    scope: req.params.scope
  })
  .select('-_id tags')
  .exec(function (err, results) {
    if (err) {
      console.error('Error when querying mc-mods. Error: ', err);
      res.status(500).json({'message': 'Query error. See server log for details'});
      return;
    }

    if (!results) {
      // Result is empty
      res.status(404).json({
        message: 'scope not found'
      });
      return;
    }

    res.json(results);
  });
});

module.exports = router;
