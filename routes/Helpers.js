'use strict';

var Clients = require('../lib/Clients.js');
var Ipaddress = require('../lib/Helpers.js');

const Helpers = {
  client: new Clients(process.env.CLIENT_ID, process.env.CLIENT_SECRET, false),
  ip_address: Ipaddress.getUserIP(),
  fingerprint: 'fingerprint',
  // fill these in with values associated with your own keys
  user_id: 'userID',
  // Make sure node_id provided is allowed: "CREDIT-AND-DEBIT" permissions
  node_id: 'nodeID',
  // Make sure to_node_id provided has type: 'SYNAPSE-US' 
  to_node_id: 'toNodeID',
  trans_id: 'transID'
};

module.exports = Helpers;
