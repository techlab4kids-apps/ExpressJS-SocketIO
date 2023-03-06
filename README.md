# 📦 TechLAB4Kids SocketIO/MQTT proxy
This server act as a SocketIO server and also as MQTT client.
SocketIO connection allow clients to exchange messages. 
Specifically, this server allows messages exchange between devices supported by MBlock platform via a custom extensions we are created to support a coding project.


## ✨ Features

- [x] Run locally (host should be reachable in devices network)
- [x] Connects to Flespi service to allow data exchange even between devices on different networks
- [ ] Will expose mqtt broker capabilites (not fully implemented for now)
- [ ] Code starts as a POC so it started from forked github boilerplate

## :wrench: Configuration

Edit config.json file in the same folder of the executable file.

## :factory: Single file executable build
* Set node version to 16.9.0 via nvm (nvm install 16.19.0)
* Run npm i
* Install pkg (npm i pkg -g)
* Run pkg (nvm exec 16.19.0 pkg server.js)
