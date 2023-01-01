const mqtt = require('mqtt');


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

const topics = ["tl4k/devices/+/data", "tl4k/devices/+/command", "tl4k/sensornode"]

client.on('connect', () => {
    console.log("Connected to Flespi broker with client!")
    topics.forEach((topic) => {
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

module.exports = { client };