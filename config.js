module.exports = {
  mqtt: {
    host: 'mqtt.revoltmotors.com',
    port: 8883,
    // port: 1883,
    protocol: 'mqtts',
    // protocol: 'mqtt',
    clientId: 'backend-revolt-01',
    username: 'backend',
    clean: false,
    keepalive: 60,
    ca: './certs/ca.pem',
    cert: './certs/backend.pem',
    key: './certs/backend.key',
    qos: 1
  },

  tenant: 'revolt'
}
