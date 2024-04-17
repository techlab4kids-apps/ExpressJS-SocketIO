const mqtt = require('mqtt');
const { MQTT_SETTINGS } = require('../config');



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

let client = mqtt.connect(MQTT_SETTINGS.brokerUrl, MQTT_SETTINGS)


client.on('connect', () => {
    console.log("Connected to Flespi broker with clientID: ", MQTT_SETTINGS.clientId)
    MQTT_SETTINGS.topics.forEach((topic) => {
        console.log("Subscribing to topic: ", topic)
        client.subscribe(topic)
    })

    // client.subscribe("tl4k/devices/#")
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

module.exports = { client };