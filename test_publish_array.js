const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');

const IMEI = '860123456789012';
const TENANT = 'revolt';
const KEY_PATH = path.join(__dirname, 'device/860123456789012.key');
const CERT_PATH = path.join(__dirname, 'device/860123456789012.pem');
const CA_PATH = path.join(__dirname, 'device/ca.pem');

const options = {
    host: 'mqtt.revoltmotors.com',
    port: 8883,
    protocol: 'mqtts',
    clientId: 'test_publisher_' + Math.random().toString(16).substr(2, 6),
    clean: true,
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH),
    ca: fs.readFileSync(CA_PATH),
    rejectUnauthorized: true
};

const client = mqtt.connect(options);

client.on('connect', () => {
    console.log('Connected!');
    const topic = `/tenants/${TENANT}/devices/${IMEI}/events/all_data/jsonarray`;
    const payload = JSON.stringify([{ "imei": "860123456789012", "sequence": 1, "timestamp": 1704110400000 }]);

    client.publish(topic, payload, { qos: 0 }, (err) => {
        if (err) {
            console.error('Publish failed:', err);
        } else {
            console.log('Publish successful to:', topic);
        }
        client.end();
    });
});

client.on('error', (err) => {
    console.error('Connection error:', err);
    client.end();
});
