var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// Bootstrap app
router.get('/mc-mods/', function (req, res, next) {
  res.render('bs-index');
});

// Polymer app. Unstable and under testing...
router.get('/mc-mods/polymer.*', function (req, res, next) {
  res.sendFile(__dirname + 'public/views/mc-mods.html');
});

module.exports = router;
