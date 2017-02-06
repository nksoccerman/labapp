
var ping = require('net-ping');
var SSH = require('simple-ssh');
const dns = require('dns');
var async = require('async');
var schema = require('./schemas')
//var exports = module.exports = {}
//exports and module.exports both point to the object returned from require()

function getMachines(db, callback){
  var machines = {num: 0, up: []};
  var System = db.model('system', schema.System);
  System.find({}, function(err, docs){
    async.each(docs, function(machine, done) {
      isMachineUP(machine.ip, function(isUP) {
        if (isUP) {
          machines.num += 1;
          machines.up.push(machine.ip);
        } 
        done()
      });
    }, function(err) {
      console.log('Successfully got machines that are up, falling to ssh callback...');
      callback(machines)
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
exports.updateIPs = function(db) {
  var System = db.model('system', schema.System);
  System.find({}, function(err, docs){
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
                System.update({name : system.name}, {$set: {ip: ip, isUP: true}});
            });
          });
      });
      } else {
        session.pingHost(system.ip, function(error, host){
          if(!error)
            System.update({name: system.name}, {$set: {isUP: true}});
        });
      }
    });
  });
}

exports.doSSH = function(db) {
  var System = db.model('system', schema.System);
  var userCMD = "sudo who -q | awk 'NR==1'";
  var cpuCMD = 'sudo top -bn1 | grep "Cpu(s)" | ' + 
           'sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | ' + 
           "awk '{print 100 - $1\"%\"}'"; 
  getMachines(db, function(machines) {
    console.log(machines);
    machines.up.forEach(function(ip) {
      var ssh = new SSH({
        host: ip, 
        user: 'polytopia', 
        pass: 'm47h14b$'
      });
      ssh.exec(userCMD, {
          pty: true,
  	  out: function(stdout) {
	    userCb(db, stdout, ip)
	  }
      }).exec(cpuCMD, {
        pty: true,
	out: function(stdout) {
	   cpuCb(db, stdout, ip)
	}
      }).start();
    });
  });
}


//each of these functions are callbacks that handle a response to a command over ssh then proccess it and post the results
function userCb(db, data, ip) {
  var fileCMD = data.replace(' ', ' -u ').replace('\r\n','');
  fileCMD = 'sudo lsof -a -d txt -u ' + fileCMD + ' | wc -l';
  var ssh = new SSH({host:ip, user:'polytopia', pass:'m47h14b$'});
  console.log(fileCMD);
  ssh.exec(fileCMD, {
    out: function(stdout) {
      fileCb(db, stdout, ip);
    },
    pty: true,
    err: function(stderr) { //error handler... add some more
      console.log(stderr)
    }
  }).start();
  
  var System = db.model('system', schema.System);
  System.findOneAndUpdate({ip: ip}, {users: data.replace('\r\n', '').split(' ')}, function(err, doc){
    console.log("updating users: " + data);
  });
}

function cpuCb(db, data, ip){
  var System = db.model('system', schema.System);
  var cpu_s = data.replace('\r\n', '').replace('%', '');
  var cpu_i = parseFloat(cpu_s);
  System.findOneAndUpdate({ip: ip}, {cpu: cpu_i}, function(err, doc) {
    console.log("updating cpu: " + cpu_i);
  });
}

function fileCb(db, data, ip){
  var System = db.model('system', schema.System);
  System.findOneAndUpdate({ip: ip}, {openFiles: data.replace('\r\n', '')}, function(err, doc) {
    console.log("updating files: " + data);
  });
}
 


