'use strict';
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var cors = require('cors');
var router = express.Router();

var app = express();

var loggedIn = require('./helpers/loggedIn');
var User = require('./models/user');

//Here we are configuring express to use body-parser as middle-ware.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: 'SECRET', resave: false, saveUninitialized: false }));

app.use(passport.initialize());
app.use(passport.session());

app.use(cors());

router.get('/data', loggedIn, function(req, res, next) {
    res.json(req.user.tasks);
});

router.post('/data', loggedIn, function(req, res, next) {
    console.log(req.body.tasks);
    req.user.tasks.forEach((task, index) => {
        var newTask = req.body.tasks.find(item => item.key === task.key);
        var last_updated = new Date(task.last_updated);
        req.user.tasks[index] = (newTask && new Date(newTask.last_updated) > last_updated ? newTask : task);
    });
    req.body.tasks.forEach((newTask) => {
        if (!req.user.tasks.some(item => item.key === newTask.key)) {
            req.user.tasks.push(newTask);
        }
    });
    User.findByIdAndUpdate(req.user._id,{
        $set: {
            tasks: req.user.tasks
        }
    }, (err) => {
        if (err) {
            next(err);
        }
        res.sendStatus(200);
    })
    // req.user.save((err) => {
    //     if (err) {
    //         next(err);
    //     }
    //     res.sendStatus(200);
    // });
});

router.post('/login', passport.authenticate('local'), function(req, res){
    var randomNumber = Math.random().toString();
    randomNumber = randomNumber.substring(2, randomNumber.length);
    res.cookie('au', randomNumber, {});
    res.sendStatus(200);
});

//To server index.html page
router.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});
router.get('/login', function (req, res) {
    res.sendFile(__dirname + '/login.html');
});

app.use(router);

//To server static assests in root dir
app.use(express.static(__dirname));

passport.use(new LocalStrategy(
  function(username, password, done) {
    User.findOne({ email: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (user.password !== password) { return done(null, false); }
      return done(null, user);
    });
  }
));
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.sendStatus(err.status || 500);
});

app.listen(process.env.PORT || 3000, function() {
    console.log('Local Server : http://localhost:3000');
});
