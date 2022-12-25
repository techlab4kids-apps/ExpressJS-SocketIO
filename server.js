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

//const { client } = require('./mqtt/mqtt-client');
const mqtt = require('mqtt');

/**
 * Socket.io section
 */
const io = require('socket.io')(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
io.on('connection', function(socket) {

    console.log(`New connection: ${socket.id}`);

    socket.emit('Nuovo evento', { messaggio: 'Ciao a tutti' });

    socket.on('disconnect', () => console.log(`Connection left (${socket.id})`));

});


const flespiConfig = {
    username: "FlespiToken sVOnzW676JCdey42x2AcIMKdn5XUeeJu0lIn8Cj29J4e7Y4uOuuk42ohXb20fzk3",
    password: "",
    clientId: "TL4K-SocketIO"
}

const localConfig = {
    host: new URL("http://localhost"),
    port: 1883,
    username: "",
    password: "",
    clientId: "TL4K-SocketIO-Mqtt-Proxy"
}

/*
    Agrumino data mqtt payload
    String payload = "{";
    payload += "\"temperatura\":";
    payload += agruminoData.temperature;
    payload += ",";
    payload += "\"umidita' del terreno\":";
    payload += agruminoData.soilMoisture;
    payload += ",";
    payload += "\"luminosita'\":";
    payload += agruminoData.illuminance;
    payload += ",";
    payload += "\"stato del led\":";
    payload += agruminoData.isLedOn;
    // payload += ",";

    // payload += "\"batteryVoltage\":";
    // payload += agruminoData.batteryVoltage;
    // payload += ",";
    // payload += "\"batteryLevel\":";
    // payload += agruminoData.batteryLevel;
    // payload += ",";
    // payload += "\"isAttachedToUSB\":";
    // payload += agruminoData.isAttachedToUSB;
    // payload += ",";
    // payload += "\"isBatteryCharging\":";
    // payload += agruminoData.isBatteryCharging;
    // payload += ",";

    payload += "}";

 */

// let client = mqtt.connect("mqtt://test.mosquitto.org")
let client = mqtt.connect("wss://mqtt.flespi.io", flespiConfig)

const topics = ["tl4k/devices/+/data", "tl4k/devices/+/command"]

client.on('connect', () => {
    console.log("Connected to Flespi broker with client!")
    // topics.forEach((topic) => {
    //     console.log("Subscribing to topic: ", topic)
    //     client.subscribe(topic)
    // })

    client.subscribe("tl4k/devices/#")
})

client.on('error', (error) => {
    console.log("[Mqtt client] Error: " + JSON.stringify(error));
})

client['stream'].on('error', (error) => {
    // fires when connection can't be established
    // but not when an established connection is lost
    console.log('[Mqtt client] stream error', error);
    client.end();
});

client.on('message', (topic, message) => {
    console.log('Received message on Topic: ', topic);

    if (topic.includes('data')) {
        io.emit('mqtt data', JSON.parse(message.toString()));
    } else if (topic.includes('command')) {
        io.emit('mqtt command', JSON.parse(message.toString()));
    } else {
        io.emit('mqtt message', JSON.parse(message.toString()));
    }

});