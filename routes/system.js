var express = require('express');
var router = express.Router();
var ping = require('net-ping');
const dns = require('dns');
var core = require('../core');

router.get('/', function(req, res, next){
  var db = req.db;
  var collection = db.get('systems');
  collection.find({}, {}, function(e, docs){
    res.render('systemlist', {
     'systemlist' : docs });
  });  
});

router.post('/addSystem', function(req, res) {
  var db = req.db
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
  var collection = db.get('systems');
  //TODO: add name check

  collection.insert({
   'name': systemName,
   'ip': systemIP,
   'os' : systemOS,
   'hostname': systemHost,
   'admin' : systemAdmin,
   'adminPass' : systemAdminPass, //TODO: add hashes and password database
   'flags': sshFlags,
   'isUP': false,
   'lastCheck': 0 //TODO: time value integration
   }, function(err, docs) {
     if(err) {
       res.send("Error inserting into database");
     } else {
       res.redirect("systems");
     }
   });
});

router.post('/removeSystem', function(req, res) {
  var db = req.db;
  var systems = db.get('systems');
  //TODO: add verification checking here!
  users.remove({ 'name' : req.name}, function(err, docs) {
    if(err) {
      next(err);
    } else {
      res.redirect("systems");
    }
  });
});

router.get('/updateSystem', function(req, res) {
  //TODO: another verification check! don't want random ppl...
  core.updateIPs();
  core.doSSH();
  res.redirect('/');
});

module.exports = router;
