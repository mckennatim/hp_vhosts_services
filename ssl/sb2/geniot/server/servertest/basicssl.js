var mosca = require('mosca')
var SECURE_KEY='../../../../../somecerts/webserver.key'
var SECURE_CERT='../../../../../somecerts/webserver.crt';
var ascoltatore = {
  //using ascoltatore
  type: 'mongo',        
  url: 'mongodb://localhost:27017/mqtt',
  pubsubCollection: 'ascoltatori',
  mongo: {}
};
var moscaSettings = {
  backend: ascoltatore,
  persistence: {
    factory: mosca.persistence.Mongo,
    url: 'mongodb://localhost:27017/mqtt'
  },
  secure : {
    port: 8883,
    keyPath: SECURE_KEY,
    certPath: SECURE_CERT,
  }   
};
var server = new mosca.Server(moscaSettings);
server.on('ready', setup);
server.on('clientConnected', function(client) {
    console.log('client connected', client.id);
    setInterval(function () { 
      server.publish({topic: 'fromBroker', payload: 'one message from broker'}, function(){
        //console.log('sent message')
      })
    }, 4000);          
});
server.on('published', function(packet, client) {
  console.log('topic ', packet.topic.toString(),' payload ', packet.payload.toString());
});
function setup() {
  console.log('Mosca server is up and running')
}