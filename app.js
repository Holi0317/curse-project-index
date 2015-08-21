var express = require('express');
var path = require('path');
var logger = require('morgan');
var mongoose = require('mongoose');
var CronJob = require('cron').CronJob;

mongoose.connect('mongodb://localhost/curse');
mongoose.connection.on('error', function (err) {throw err;});
mongoose.connection.once('open', function () {
  console.log('Database connected');
});

var routes = require('./routes/index');
var apiRouter = require('./routes/api');
var job = require('./job');

var app = express();

app.enable('trust proxy');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'dist')));

app.use('/', routes);
app.use('/api', apiRouter);
app.get('*', function(req, res){
  res.status(404).send('Sorry. But I got a 404');
});

if (app.get('env') === 'development') {
  app.set('json spaces', 4);
}

// error handler
app.use(function(err, req, res, next) {
  res.status(err.status || 500).send('Internal server error. Consider reporting this to deveoper');
});

// Cron job for updating database, executed every day at 00:00:00, UTC
new CronJob({
  cronTime: '00 00 00 * * *',
  onTick: job,
  start: true,
  timeZone: 'UTC'
});

module.exports = app;
