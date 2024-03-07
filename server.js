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
let httpServer;

const whitelist = ['http://localhost:3030', 'http://fls-server:3030', 'https://ide.mblock.cc'];
/**
 * Configure middleware
 */

app.options('*', cors());

const corsOptions = {
    credentials: true,
    origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
};
app.use(
    cors(corsOptions),
    session({
        saveUninitialized: true,
        secret: srvConfig.SESSION_SECRET,
        resave: true,
    }),
    cookieParser(),
    bodyParser.json()
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
    console.log('SocketIO server listening on port ', srvConfig.SERVER_PORT);
    // mongoose.connect(`${CONNECTION_TYPE}://${dbAuthString}${DB_HOST}:${DB_PORT}/${DB_NAME}${DB_QUERY_PARAMS}`, {
    //     useNewUrlParser: true,
    //     useUnifiedTopology: true
    // }, () => {
    //     console.log(`Server started on port ${srvConfig.SERVER_PORT}`);
    // });
});

// Mqtt aedes section

const aedes = require('aedes')();
const mqttServer = require('net').createServer(aedes.handle);
const mqttServerPort = 1883;

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

const { client } = require('./mqtt/mqtt-client');
// const mqtt = require('mqtt');

/**
 * Socket.io section
 */
const io = require('socket.io')(httpServer, {
    cors: cors(corsOptions),
    handlePreflightRequest: (req, res) => {
        const headers = {
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Origin': req.headers.origin, // Adjust this line to match your needs
            'Access-Control-Allow-Credentials': true,
        };
        res.writeHead(200, headers);
        res.end();
    },
});

async function handleIoSocketEvent(eventName, currentSocketId, ...args) {

    if (eventName == 'mqtt command') {
        let messageObject = args[0];
        const deviceId = messageObject.deviceId;
        const topic = `tl4k/devices/${deviceId}/command`;
        client.publish(topic, JSON.stringify(messageObject), { retain: true });
    }
    const sockets = await io.fetchSockets();
    sockets.forEach(socket => {
        if (socket.id != currentSocketId) {
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

    if (!message) {
        console.log('Received empty message');
        return;
    }

    let messageObject;

    try {
        messageObject = JSON.parse(message.toString());
    } catch (exception) {
        console.log('Error parsing: ' + message.toString());
        return;
    }

    if (topic.includes('data')) {
        const regExp = new RegExp('tl4k\/devices\/(.*?)\/data');
        let deviceId = '';

        let match = regExp.exec(topic);
        if (match) {
            deviceId = match[1];
            console.log(deviceId);
            messageObject.deviceId = deviceId;
            io.emit('mqtt data', messageObject);
        }
    }
        // else if (topic.includes('command')) {
        //     // TODO add recipient to Mblock message
        //     const deviceId = messageObject.deviceId;
        //     const topic = `tl4k/devices/${deviceId}/command`;
        //     client.publish(topic, messageObject);
        //     io.emit('mqtt command', messageObject);
    // }
    else {
        io.emit('mqtt message', messageObject);
    }

});
