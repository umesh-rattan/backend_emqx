const http = require('http');

const data = JSON.stringify({
    imei: '860123456789012',
    name: 'test_action',
    payload: { key: 'value' }
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/send-action',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
