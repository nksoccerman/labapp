var mongoose = require('mongoose');
var schema = mongoose.Schema; 

exports.System = schema({
  admin: String, 
  adminPass: String, 
  flags: String, 
  hostname: String, 
  ip: String, 
  isUp: Boolean, 
  lastCheck: Number, 
  name: String, 
  os: String, 
  users: String, 
  cpu: String, 
  openFiles: String, 
  programmingVers: [String] 
});

exports.Stat = schema({
  cpu: Number, 
  ip: String,
  openFiles: Number, 
  users: [String]
});

