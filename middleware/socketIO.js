exports.socketIOInit = (httpServer, whitelist) => {
    /**
     * Socket.io section
     */
    const io = require('socket.io')(httpServer, {
        cors: {
            origin: whitelist,
            methods: ['GET', 'POST'],
        },
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
}

