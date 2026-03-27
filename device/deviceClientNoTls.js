const mqtt = require('mqtt');
const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// --- Configuration ---
const IMEI = process.argv[2] || '867512078558356';
const TENANT = 'revolt';
const BROKER_HOST = 'mqtt.revoltmotors.com';
const BROKER_PORT = 1883;

// --- MQTT Setup ---

// Generate random ClientID to avoid conflicts during testing
const CLIENT_ID = IMEI;

const options = {
    host: BROKER_HOST,
    port: BROKER_PORT,
    protocol: 'mqtt',
    clientId: CLIENT_ID,
    username: IMEI,
    clean: true
};

console.log(`🔌 Device starting... ClientID: ${CLIENT_ID}`);

// --- Express & Socket.io Setup ---
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files if needed

// Dashboard HTML
const DASHBOARD_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Device Dashboard - ${IMEI}</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f4f7f6; color: #333; height: 100vh; display: flex; flex-direction: column; }
        header { background: #2c3e50; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        h1 { margin: 0; font-size: 1.2rem; }
        .status-badge { background: #e74c3c; color: white; padding: 5px 10px; border-radius: 4px; font-size: 0.9rem; font-weight: bold; }
        .status-badge.connected { background: #27ae60; }
        
        .container { display: flex; flex: 1; padding: 20px; gap: 20px; overflow: hidden; }
        .panel { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); display: flex; flex-direction: column; overflow: hidden; }
        
        .left-panel { flex: 1; max-width: 400px; padding: 20px; }
        .right-panel { flex: 2; padding: 0; }
        
        h2 { margin-top: 0; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; color: #2c3e50; font-size: 1.1rem; }
        
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.9rem; }
        input, textarea, select { width: 100%; padding: 10px; border: 1px solid #bdc3c7; border-radius: 4px; box-sizing: border-box; font-size: 0.9rem; }
        input:focus, textarea:focus { border-color: #3498db; outline: none; }
        
        button { background: #3498db; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%; transition: background 0.2s; }
        button:hover { background: #2980b9; }
        
        .log-container { flex: 1; overflow-y: auto; padding: 20px; font-family: 'Consolas', 'Monaco', monospace; background: #2c3e50; color: #ecf0f1; font-size: 0.9rem; }
        .log-entry { margin-bottom: 8px; border-bottom: 1px solid #34495e; padding-bottom: 8px; }
        .log-entry .time { color: #95a5a6; font-size: 0.8rem; }
        .log-entry .topic { color: #f1c40f; font-weight: bold; }
        .log-entry .direction { font-weight: bold; margin-right: 5px; }
        .log-entry .direction.in { color: #2ecc71; } /* Green for IN */
        .log-entry .direction.out { color: #3498db; } /* Blue for OUT */
        .log-entry pre { margin: 5px 0 0 15px; color: #e0e0e0; white-space: pre-wrap; word-wrap: break-word; }

        .presets { display: flex; gap: 5px; margin-bottom: 10px; flex-wrap: wrap; }
        .preset-btn { background: #ecf0f1; color: #2c3e50; border: 1px solid #bdc3c7; padding: 5px 8px; font-size: 0.8rem; width: auto; }
        .preset-btn:hover { background: #bdc3c7; }
    </style>
</head>
<body>
    <header>
        <div>
            <h1>Device Dashboard</h1>
            <small>IMEI: ${IMEI}</small>
        </div>
        <div id="connectionStatus" class="status-badge">Disconnected</div>
    </header>
    
    <div class="container">
        <!-- Publisher Section -->
        <div class="panel left-panel">
            <h2>📤 Publish Data</h2>
            <div class="form-group">
                <label for="topic">Topic</label>
                <input type="text" id="topic" value="/tenants/${TENANT}/devices/${IMEI}/events/custom">
            </div>
            
            <div class="form-group">
                <label>Presets</label>
                <div class="presets">
                    <button class="preset-btn" onclick="setPreset('status')">Status</button>
                    <button class="preset-btn" onclick="setPreset('telemetry')">Telemetry</button>
                    <button class="preset-btn" onclick="setPreset('error')">Error</button>
                </div>
            </div>

            <div class="form-group">
                <label for="payload">Payload (JSON)</label>
                <textarea id="payload" rows="8">{\n  "status": "online",\n  "battery": 98\n}</textarea>
            </div>
            <button onclick="publishMessage()">Publish</button>
        </div>

        <!-- Subscriber/Log Section -->
        <div class="panel right-panel">
             <div style="padding: 10px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <h2>📥 Live Logs</h2>
                <button onclick="document.getElementById('logs').innerHTML = ''" style="width: auto; background: #e74c3c; padding: 5px 10px; font-size: 0.8rem;">Clear</button>
            </div>
            <div id="logs" class="log-container">
                <!-- Logs will appear here -->
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        const statusEl = document.getElementById('connectionStatus');
        const logsEl = document.getElementById('logs');

        // Presets for quick testing
        const presets = {
            'status': {
                topic: '/tenants/${TENANT}/devices/${IMEI}/action/status',
                payload: { action_id: "test_id", state: "Completed", timestamp: Date.now() }
            },
            'telemetry': {
                topic: '/tenants/${TENANT}/devices/${IMEI}/events/all_data/jsonarray',
                payload: [
  {
    "timestamp": 1704110400000,
    "sequence": 123,
    "latitude": 28.6139,
    "longitude": 77.209,
    "altitude": 216.5,
    "speed": 45.2,
    "satellites_gps": 12,
    "satellites_beidou": 5,
    "satellites_used": 15,
    "fix_type": 3,
    "fix_status": 1,
    "pdop": 1.2,
    "hdop": 0.8,
    "vdop": 1.0,
    "azimuth": 45.6,
    "course": 180.5,
    "status": "On",
    "battery_voltage": 3800,
    "external_voltage": 12000,
    "gps_fix_mode": 3,
    "modem_app_version": "2.5.1",
    "modem_base_version": "L511_base_v1.0",
    "controller_version": "2.0.0",
    "imei": "${IMEI}",
    "iccid": "8910300000000000000F",
    "ble_mac": "AA:BB:CC:DD:EE:FF",
    "msisdn": "9876543210",
    "gsm_status": 1,
    "gps_status": 1,
    "gps_ttff_s": 15,
    "imsi": "404123456789012",
    "apn": "internet",
    "csq": 25,
    "internal_available_disk_size_bytes": 1048576,
    "external_available_disk_size_bytes": 2097152,
    "modem_uptime_ms": 3600000,
    "gps_odometer_m": 12345.5,
    "can_odometer_m": 12340.0,
    "rpm_odometer_m": 12342.0,
    "external_battery_voltage_mv": 12000,
    "internal_battery_voltage_mv": 3800,
    "bluetooth_status": 1,
    "connected_device_name": "BLE_Scanner",
    "connected_device_mac": "AA:BB:CC:DD:EE:FF",
    "analog_input1_mv": 1500,
    "digital_output1_status": 1,
    "digital_output2_status": 0,
    "digital_input1_status": 1,
    "digital_input2_status": 0,
    "ignition_status": 1,
    "charging_status": 0,
    "controller_uptime_s": 1800,
    "engine_rpm": 2500,
    "engine_coolant_temp": 85,
    "vehicle_speed": 45,
    "fuel_level_percent": 65,
    "throttle_position": 30,
    "event_data_name": "ignition_on",
    "event_data_value": ""
  }
]
            },
            'error': {
                topic: '/tenants/${TENANT}/devices/${IMEI}/events/error',
                payload: { code: 500, message: "Sensor failure" }
            }
        };

        function setPreset(name) {
            const p = presets[name];
            if(p) {
                document.getElementById('topic').value = p.topic;
                document.getElementById('payload').value = JSON.stringify(p.payload, null, 2);
            }
        }

        function addLog(type, topic, msg) {
            const div = document.createElement('div');
            div.className = 'log-entry';
            const time = new Date().toLocaleTimeString();
            const dirIcon = type === 'out' ? '⬆️ OUT' : '⬇️ IN';
            const dirClass = type;
            
            // Try to pretty print JSON
            let content = msg;
            try {
                if (typeof msg === 'object') {
                    content = JSON.stringify(msg, null, 2);
                } else {
                    const parsed = JSON.parse(msg);
                    content = JSON.stringify(parsed, null, 2);
                }
            } catch(e) {}

            div.innerHTML = \`
                <div><span class="time">\${time}</span> <span class="direction \${dirClass}">\${dirIcon}</span> <span class="topic">\${topic}</span></div>
                <pre>\${content}</pre>
            \`;
            logsEl.insertBefore(div, logsEl.firstChild);
        }

        function publishMessage() {
            const topic = document.getElementById('topic').value;
            const payloadStr = document.getElementById('payload').value;
            
            try {
                // Validate JSON
                JSON.parse(payloadStr);
                socket.emit('publish', { topic, message: payloadStr });
            } catch (e) {
                alert('Invalid JSON');
            }
        }

        // Socket Events
        socket.on('connect', () => {
            console.log('Connected to Dashboard Server');
        });

        socket.on('mqtt_status', (data) => {
            statusEl.textContent = data.connected ? 'MQTT Connected' : 'MQTT Disconnected';
            statusEl.className = 'status-badge ' + (data.connected ? 'connected' : '');
        });

        socket.on('mqtt_message', (data) => {
            addLog('in', data.topic, data.message);
        });

        socket.on('publish_confirm', (data) => {
            addLog('out', data.topic, data.message);
        });

    </script>
</body>
</html>
`;

app.get('/', (req, res) => {
    res.send(DASHBOARD_HTML);
});

// --- MQTT Client ---
const client = mqtt.connect(`mqtt://${BROKER_HOST}:${BROKER_PORT}`, options);

client.on('connect', () => {
    console.log('✅ Connected to MQTT Broker');
    io.emit('mqtt_status', { connected: true });

    // Subscribe to Action Topic
    const actionTopic = `/tenants/${TENANT}/devices/${IMEI}/actions`;
    client.subscribe(actionTopic, { qos: 0 }, (err) => {
        if (!err) console.log(`📡 Subscribed to: ${actionTopic}`);
    });
});

client.on('message', (topic, message) => {
    const msgStr = message.toString();
    console.log(`\n📥 Action received on ${topic}:`);

    // Emit to Dashboard
    io.emit('mqtt_message', { topic, message: msgStr });

    // Handle Actions (Existing Logic)
    try {
        const action = JSON.parse(msgStr);
        if (action.id) {
            // Auto-respond for testing loop
            setTimeout(() => {
                const statusPayload = [{
                    action_id: action.id,
                    timestamp: Date.now(),
                    state: "Completed",
                    progress: 100,
                    errors: []
                }];
                const statusTopic = `/tenants/${TENANT}/devices/${IMEI}/action/status`;

                client.publish(statusTopic, JSON.stringify(statusPayload), { qos: 1 });

                // Show auto-response in dashboard too
                io.emit('publish_confirm', { topic: statusTopic, message: JSON.stringify(statusPayload) });

            }, 2000);
        }
    } catch (e) {
        console.error('Error processing message:', e);
    }
});

client.on('error', (err) => {
    console.error('❌ MQTT Error:', err);
    io.emit('mqtt_status', { connected: false });
});

client.on('close', () => {
    io.emit('mqtt_status', { connected: false });
});

// --- Socket.io Logic ---
io.on('connection', (socket) => {
    console.log('💻 Dashboard connected');
    // Send initial status
    socket.emit('mqtt_status', { connected: client.connected });

    // Handle Publish Request from UI
    socket.on('publish', (data) => {
        const { topic, message } = data;
        console.log(`📤 Dashboard Request: Publish to ${topic}`);

        client.publish(topic, message, { qos: 0 }, (err) => {
            if (!err) {
                socket.emit('publish_confirm', { topic, message });
            } else {
                console.error('Publish error:', err);
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Device Dashboard running at http://localhost:${PORT}`);
});
