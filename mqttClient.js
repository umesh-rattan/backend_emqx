const mqtt = require('mqtt');
const fs = require('fs');
const config = require('./config');

const client = mqtt.connect(`mqtts://${config.mqtt.host}:${config.mqtt.port}`, {
  clientId: config.mqtt.clientId,
  username: config.mqtt.username,
  clean: false,
  keepalive: config.mqtt.keepalive,
  ca: fs.readFileSync(config.mqtt.ca),
  cert: fs.readFileSync(config.mqtt.cert),
  key: fs.readFileSync(config.mqtt.key),
  rejectUnauthorized: true
});

client.on('connect', () => {
  console.log('MQTT backend connected');

  client.subscribe([
    `/tenants/${config.tenant}/devices/+/events/all_data/jsonarray`,
    `/tenants/${config.tenant}/devices/+/action/status`,
    `/tenants/${config.tenant}/devices/+/events/can_raw/jsonarray`
  ], { qos: 0 });
});

client.on('error', err => {
  console.error('MQTT error', err);
});

module.exports = client;
