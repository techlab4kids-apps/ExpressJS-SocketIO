'use strict';
const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const expressSwagger = require('express-swagger-generator')(app);
const srvConfig = require('./config');
// const mongoose = require('mongoose');
const { CONNECTION_TYPE, DB_HOST, DB_USERNAME, DB_PASSWORD, DB_PORT, DB_NAME, DB_QUERY_PARAMS } = srvConfig;
const dbAuthString = (DB_USERNAME && DB_PASSWORD) ? `${srvConfig.DB_USERNAME}:${srvConfig.DB_PASSWORD}@` : '';
let httpServer;


/**
 * Configure middleware
 */
const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.options('*', cors());
app.use(
    cors({
        // origin: `http://localhost:${srvConfig.SERVER_PORT}`,
        origin: function(origin, callback) {
            return callback(null, true);
        },
        optionsSuccessStatus: 200,
        credentials: false,
    }),
    session({
        saveUninitialized: true,
        secret: srvConfig.SESSION_SECRET,
        resave: true,
    }),
    cookieParser(),
    bodyParser.json(),
);

/**
 * Include all API Routes
 */
app.use('/api', require('./routes/api'));

/**
 * Swagger UI documentation
 */
if (srvConfig.SWAGGER_SETTINGS.enableSwaggerUI)
    expressSwagger(srvConfig.SWAGGER_SETTINGS);

/**
 * Configure http(s)Server
 */
if (srvConfig.HTTPS_ENABLED) {
    const privateKey = fs.readFileSync(srvConfig.PRIVATE_KEY_PATH, 'utf8');
    const certificate = fs.readFileSync(srvConfig.CERTIFICATE_PATH, 'utf8');
    const ca = fs.readFileSync(srvConfig.CA_PATH, 'utf8');

    // Create a HTTPS server
    httpServer = https.createServer({ key: privateKey, cert: certificate, ca: ca }, app);
} else {
    // Create a HTTP server
    httpServer = http.createServer({}, app);
}

/**
 * Start http server & connect to MongoDB
 */
httpServer.listen(srvConfig.SERVER_PORT, () => {
    // mongoose.connect(`${CONNECTION_TYPE}://${dbAuthString}${DB_HOST}:${DB_PORT}/${DB_NAME}${DB_QUERY_PARAMS}`, {
    //     useNewUrlParser: true,
    //     useUnifiedTopology: true
    // }, () => {
    //     console.log(`Server started on port ${srvConfig.SERVER_PORT}`);
    // });
});

// Mqtt aedes section

const aedes = require('aedes')()
const mqttServer = require('net').createServer(aedes.handle)
const mqttServerPort = 1883

mqttServer.listen(mqttServerPort, function () {
    console.log('mqtt server started and listening on port ', mqttServerPort)
})

const mqttHttpServer = require('http').createServer()
const ws = require('websocket-stream')
const mqttHttpServerPort = 8888

ws.createServer({ server: mqttHttpServer }, aedes.handle)

mqttHttpServer.listen(mqttHttpServerPort, function () {
    console.log('mqtt websocket server listening on port ', mqttHttpServerPort)
})

const { client } = require('./mqtt/mqtt-client');
// const mqtt = require('mqtt');

/**
 * Socket.io section
 */
const io = require('socket.io')(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

async function handleIoSocketEvent(eventName, currentSocketId, ...args) {

    if(eventName == "mqtt command"){
        let messageObject = args[0];
        const deviceId = messageObject.deviceId;
        const topic = `tl4k/devices/${deviceId}/command`;
        client.publish(topic, JSON.stringify(messageObject));
    }
    const sockets = await io.fetchSockets()
    sockets.forEach(socket => {
        if(socket.id != currentSocketId){
            socket.emit(eventName, ...args);
        }
    });
}

io.on('connection', function(socket) {

    console.log(`New connection: ${socket.id}`);

    socket.emit('Nuovo evento', { messaggio: 'Ciao a tutti' });

    socket.on('disconnect', () => console.log(`Connection left (${socket.id})`));

    socket.onAny((eventName, ...args) => {
        handleIoSocketEvent(eventName, socket.id, ...args);
    });

});

client.on('message', (topic, message) => {
    console.log('Received message on Topic: ', topic);

    if (!message){
        console.log('Received empty message');
        return;
    }

    let messageObject;

    try{
        messageObject = JSON.parse(message.toString());
    }catch(exception){
        console.log("Error parsing: " + message.toString());
        return;
    }

    if (topic.includes('data')) {
        const regExp = new RegExp('tl4k\/devices\/(.*?)\/data');
        let deviceId = ""

        let match = regExp.exec(topic);
        if(match) {
            deviceId = match[1]
            console.log(deviceId);
            messageObject.deviceId = deviceId;
            io.emit('mqtt data', messageObject);
        }
    } else if (topic.includes('command')) {
        // TODO add recipient to Mblock message
        const deviceId = messageObject.deviceId;
        const topic = `tl4k/devices/${deviceId}/command`;
        client.publish(topic, messageObject);
        io.emit('mqtt command', messageObject);
    } else {
        io.emit('mqtt message', messageObject);
    }

});