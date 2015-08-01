var mongoose = require('mongoose');

var mcModsSchema = mongoose.Schema({
  id_: Number,
  slug: String,
  fancyName: String,
  description: String,
  author: String,
  downloadCount: Number,
  tags: [String],
});

var infoSchema = mongoose.Schema({
  lastUpdate: {type: Date, default: Date.now},
});

var tagSchema = mongoose.Schema({
  scope: String,
  tags: {},
});

module.exports = {
  'mc-mods': mongoose.model('mc-mods', mcModsSchema),
  'info': mongoose.model('info', infoSchema),
  'tags': mongoose.model('tags', tagSchema)
};
