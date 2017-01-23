var express = require('express')
var router = express.Router()
var core = require('../core')

router.get('/', function(req, res, next) {
  var db = req.db;
  var stats = db.get('sysstats');
  stats.find({ip: {$exists: true}}, {}, function(err, docs){
    totalCpu = 0.0;
    totalFiles = 0;
    totalUsers = 0;
    docs.forEach(function(doc){
      totalCpu += doc.cpu;
      if(doc.totalFiles != 'NaN')
        totalFiles += doc.openFiles;
      totalUsers += doc.users.length;
      //check if at end - stupid async cb's...
      console.log(doc);
      if (docs[docs.length-1] == doc){
    
        stats.findOne({machinesUp: {$exists: true}}, function(err, doc) {
          machinesUp = doc.machinesUp;
          res.render('dash', {totalCpu: totalCpu, totalFiles: totalFiles, totalUsers: totalUsers, machinesUp:machinesUp});
        });
      }
    });
  });
});

module.exports = router
