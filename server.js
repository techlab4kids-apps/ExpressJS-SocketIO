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
const { socketIOInit } = require('./middleware/socketIO');
const { mqttServerInit } = require('./middleware/mqtt');
let httpServer;

const whitelist = ['http://localhost:3030', 'http://fls-server:3030', 'https://ide.mblock.cc'];

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
// app.use('/api', require('./routes/api'));

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
 * Start http server
 */
httpServer.listen(srvConfig.SERVER_PORT, () => {
    console.log('SocketIO server listening on port ', srvConfig.SERVER_PORT);
});

// const mqttServer = require(memberSearchIndex
// const socketIO = require(socketIOInit)
mqttServerInit()
socketIOInit(httpServer, whitelist)


