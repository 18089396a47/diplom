var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var connection = require('../helpers/connection');
var passportLocalMongoose = require('passport-local-mongoose');

var userSchema = new Schema({
    first_name: {
        type: String,
        required: true
    },
    last_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    tasks: {
        type: Array,
        default: [{
            done: false,
            important: false,
            label: 'Just do it!!!',
            last_updated: new Date().toISOString(),
            key: Math.random().toString()
        }]
    }
});

userSchema.plugin(passportLocalMongoose);
var user = connection.model('user', userSchema);

module.exports = user;
