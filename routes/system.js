var express = require('express');
var router = express.Router();
var ping = require('net-ping');
const dns = require('dns');
var core = require('../core');
var schemas = require('../schemas');
var async = require('async');

router.get('/', function(req, res, next){
  var db = req.db;
  var System = db.model('system', schemas.System);
  System.find(function(e, docs){
      res.render('systemlist', {
     'systemlist' : docs });
  });
});

//Temporary work-around for moving stats to systems
router.get('/sanitize', function(req, res, next) { 
  var db = req.db;
  var Stat = db.model('sysstat', schemas.Stat);
  var System = db.model('system', schemas.System);
  console.log('hit sanitizer..');
  System.find({}, function(e, docs) {
    async.each(docs, function(system, callback) {
      console.log(system);
      Stat.findOne({ip: system.ip}, function(err, stat) {
        if(stat && !err) {
          System.findByIdAndUpdate(system._id, {stats: stat.toObject()}, function(error, sys) {
            if(error) callback(error);
            callback();
          });
        }
      });
    }, function(err) { 
        if(err) console.log(err);
        else console.log('done');
    });
  });
});

router.post('/addSystem', function(req, res) {
  var db = req.db;
  var System = db.model('system', schemas.System);

  try {
    var systemName = req.systemename;
    var systemIP = req.systemIP;
    var systemOS = req.systemOS;
    var systemHost = req.systemhost;
    var systemAdmin = req.systemAdmin;
    var systemAdminPass = req.systemAdminPass
    var sshFlags = req.sshFlags
    //blah blah add more
  } catch(err){
    res.send('Bad request'); //bad error handler
  }
  //TODO: add name check

  var sys = new System({
   'name': systemName,
   'ip': systemIP,
   'os' : systemOS,
   'hostname': systemHost,
   'admin' : systemAdmin,
   'adminPass' : systemAdminPass, //TODO: add hashes and password database
   'flags': sshFlags,
   'isUP': false,
   'lastCheck': 0,
  }); 
   //TODO: time value integration

  sys.save(function(err, doc) {
   if(err) {
     res.send("Error inserting into database");
   } else {
     res.redirect("systems");
   }
  });

});

router.post('/removeSystem', function(req, res) {
  var db = req.db;
  var System = db.model('system', schemas.System);
  //TODO: add verification checking here!
  System.remove({ 'name' : req.name}, function(err) {
    if(err) {
      next(err);
    } else {
      res.redirect("systems");
    }
  });
});

router.get('/updateSystem', function(req, res) {
  //TODO: another verification check! don't want random ppl...
  core.updateIPs(req.db);
  core.doSSH(req.db);
  res.redirect('/');
});

module.exports = router;
