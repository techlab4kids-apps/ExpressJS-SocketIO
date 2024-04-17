// Mqtt aedes section
const aedes = require('aedes')();
const mqttServer = require('net').createServer(aedes.handle);
const mqttServerPort = 1883;


exports.mqttServerInit = () => {
    mqttServer.listen(mqttServerPort, function() {
        console.log('Mqtt server started and listening on port ', mqttServerPort);
    });

    const mqttHttpServer = require('http').createServer();
    const ws = require('websocket-stream');
    const mqttHttpServerPort = 8888;

    ws.createServer({ server: mqttHttpServer }, aedes.handle);

    mqttHttpServer.listen(mqttHttpServerPort, function() {
        console.log('Mqtt websocket server listening on port ', mqttHttpServerPort);
    });

    aedes.on("client", function (client) {
        console.log(`New Mqtt client: `, client.id);
    });

};
