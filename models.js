var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');

var mcModsSchema = mongoose.Schema({
  id_: Number,
  slug: String,
  fancyName: String,
  fancyNameSoundex: String,
  fancyNameFlatten: String,
  description: String,
  author: String,
  downloadCount: Number,
  tags: [String],
}).plugin(mongoosePaginate);

var infoSchema = mongoose.Schema({
  lastUpdate: {type: Date, default: Date.now},
  tags: {}
});

module.exports = {
  'mc-mods': mongoose.model('mc-mods', mcModsSchema),
  'info': mongoose.model('info', infoSchema)
};
