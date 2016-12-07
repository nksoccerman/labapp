var express = require('express')
var router = express.Router()
var core = require('../core')

router.get('/', function(req, res, next) {
//	var users = core.getUsers()
//	var machines = core.getMachines()
//	var cpu = core.getCPU()
//	var files = core.getFiles()

//	var data = {users, machines, cpu, files}
  core.doSSH();
  console.log("bleh");      
  res.render('dash'); 
});

module.exports = router
