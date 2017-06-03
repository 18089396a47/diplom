var mongoose = require('mongoose');

var connection = mongoose.connect('mongodb://admin:admin@ds133981.mlab.com:33981/heroku_fpn9k3m8');

module.exports = connection;
