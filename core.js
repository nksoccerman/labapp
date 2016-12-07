var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/labapp');
var ping = require('net-ping');
var SSH = require('simple-ssh');
const dns = require('dns');

//var exports = module.exports = {}
//exports and module.exports both point to the object returned from require()

function getMachines(callback){
  var machines = {num: 0, up: []}
  var systems = db.get('systems');
  systems.find({}, {}, function(err, docs){
    docs.forEach(function(machine) {
      isMachineUP(machine.ip, function(isUP) {
        if (isUP) {
          machines.num += 1;
          machines.up.push(machine.ip);
        } 
        if (docs[docs.length-1] == machine) {
          console.log('Successfully got machines that are up, falling to ssh callback...');
          callback(machines)
        }
      });
    });
  });
}

function isMachineUP(ip, callback) {
  var session = ping.createSession();  
  session.pingHost(ip, function(error, ip){
    if(!error){
      callback(true);
    } else {
      callback(false);
    }
  });
}

//updates and checks ifUP, hostname and ip for system entry
exports.updateIPs = function() {
  var sys = db.get('systems');
  sys.find({}, {}, function(err, docs){
    var session = ping.createSession();
    docs.forEach(function(system) {
      //first check if there's an ip!
      if(!system.ip) {
        var systemIP = dns.resolve4(system.hostname, function(err, addrs) { return addrs[0]}); //assign to first ip address
        dns.resolve4(system.hostname, function(err, addrs) { //try and find an ip address that pings!
          if(err) next(err)
          addrs.forEach(function (ip) {
            console.log(ip);
            session.pingHost(ip, function(error, host){
              if(!error)
                sys.update({name : system.name}, {$set: {ip: ip, isUP: true}});
            });
          });
      });
      } else {
        session.pingHost(system.ip, function(error, host){
          if(!error)
            sys.update({name: system.name}, {$set: {isUP: true}});
        });
      }
    });
  });
}


exports.doSSH = function() {
  var stats = db.get('sysstats');
  var userCMD = "sudo who -q | awk 'NR==1'";
  var cpuCMD = 'sudo top -bn1 | grep "Cpu(s)" | ' + 
           'sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | ' + 
           "awk '{print 100 - $1\"%\"}'"; 
  getMachines(function(machines) {
    console.log(machines);
    stats.findOne({machinesUp: {$exists: true}}, function(err, doc){
      if(doc == null) {
        stats.insert({machinesUp: machines.num});
      }
    });
    machines.up.forEach(function(ip) {
    //first check if there is a database entry!
    stats.findOne({ip: ip}, function(err, doc) {
        console.log(doc);
        if (doc == null) {
          stats.insert({ip: ip, users: [], cpu: 0.0, openFiles: 0});
        }
    });
    var ssh = new SSH({
      host: ip, 
      user: 'polytopia', 
      pass: 'm47h14b$'
    });
    ssh.exec(userCMD, {
        pty: true,
	out: function(stdout) {
	  userCb(stdout, ip)
	}
      }).exec(cpuCMD, {
        pty: true,
	out: function(stdout) {
	   cpuCb(stdout, ip)
	}
      }).start();
    });
  });
}


//each of these functions are callbacks that handle a response to a command over ssh then proccess it and post the results
function userCb(data, ip) {
  //var data = db.get('data');
  console.log(data);
  var fileCMD = data.replace(' ', ' -u ').replace('\r\n','');
  fileCMD = 'sudo lsof -a -d txt -u ' + fileCMD + ' | wc -l';
  var ssh = new SSH({host:ip, user:'polytopia', pass:'m47h14b$'});
  console.log(fileCMD);
  ssh.exec(fileCMD, {
    out: function(stdout) {
      fileCb(stdout, ip);
    },
    pty: true,
    err: function(stderr) { //error handler... add some more
      console.log(stderr)
    }
  }).start();
  
  var stats = db.get('sysstats');
  stats.update({ip: ip}, {$set: {users: data.replace('\r\n', '').split(' ')}});
}

function cpuCb(data, ip){
  var stats = db.get('sysstats');
  var cpu_s = data.replace('\r\n', '').replace('%', '');
  var cpu_i = parseFloat(cpu_s);
  stats.update({ip: ip}, {$set: {cpu: cpu_i}});
}

function fileCb(data, ip){
  var stats = db.get('sysstats')
  stats.update({ip: ip}, {$set: {openFiles: parseInt(data.replace('\r\n', ''))}});
}


