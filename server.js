const express = require('express');
const cors = require('cors');
const { sendAction } = require('./actionService');
const http = require('http');
const { Server } = require("socket.io");
const mqttClient = require('./mqttClient');
require('./telemetryConsumer');
require('./actionStatusConsumer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- MQTT Listener for Live View ---
mqttClient.on('message', (topic, message) => {
    try {
        const msgStr = message.toString();
        io.emit('device_data', { topic, message: msgStr, timestamp: Date.now() });
    } catch (e) {
        console.error('Error forwarding message to UI:', e);
    }
});

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MQTT Backend Control & Live View</title>
        <script src="/socket.io/socket.io.js"></script>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1400px; margin: 0 auto; padding: 20px; background: #f0f2f5; height: 100vh; display: flex; flex-direction: column; }
            .header { margin-bottom: 20px; }
            h1 { color: #1a1a1a; margin: 0 0 10px 0; font-size: 24px; }
            
            .main-layout { display: flex; gap: 20px; flex: 1; overflow: hidden; }
            
            .panel { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); display: flex; flex-direction: column; overflow: hidden; }
            
            /* Left Panel: Control */
            .left-panel { flex: 1; max-width: 350px; padding: 25px; }

            /* Right Panel: Live View (Split: Topics | Logs) */
            .right-panel { flex: 3; display: flex; flex-direction: row; }
            
            h2 { font-size: 18px; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 15px; color: #2d3748; }

            /* Form Styles */
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 8px; font-weight: 500; color: #4a5568; }
            input, select, textarea { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
            input:focus, textarea:focus { outline: none; border-color: #3182ce; ring: 2px solid #3182ce; }
            button { background: #3182ce; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.2s; }
            button:hover { background: #2c5282; }
            #result { margin-top: 20px; padding: 15px; border-radius: 6px; display: none; }
            .success { background: #c6f6d5; color: #22543d; border: 1px solid #9ae6b4; }
            .error { background: #fed7d7; color: #822727; border: 1px solid #feb2b2; }

            /* Topic List Sidebar */
            .topic-list { width: 300px; background: #f8fafc; border-right: 1px solid #e2e8f0; overflow-y: auto; }
            .topic-header { padding: 15px; background: #fff; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4a5568; position: sticky; top: 0; }
            .topic-item { padding: 12px 15px; cursor: pointer; border-bottom: 1px solid #edf2f7; font-size: 13px; color: #2d3748; transition: background 0.2s; word-break: break-all; }
            .topic-item:hover { background: #edf2f7; }
            .topic-item.active { background: #ebf8ff; border-left: 4px solid #3182ce; color: #2b6cb0; }
            .topic-count { float: right; background: #cbd5e0; color: #4a5568; padding: 2px 6px; border-radius: 10px; font-size: 11px; }
            .topic-item.active .topic-count { background: #bee3f8; color: #2b6cb0; }

            /* Log Container */
            .log-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: white; }
            .log-header { padding: 10px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #fff; }
            .log-container { flex: 1; overflow-y: auto; padding: 20px; font-family: 'Consolas', monospace; font-size: 13px; background: #fff; }
            
            .log-entry { margin-bottom: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; border-left: 4px solid #a0aec0; animation: fadeIn 0.2s ease; }
            .log-meta { display: flex; justify-content: space-between; margin-bottom: 5px; color: #718096; font-size: 11px; }
            .log-topic { font-weight: bold; color: #2b6cb0; margin-bottom: 5px; font-size: 12px; }
            .log-content { white-space: pre-wrap; word-break: break-all; color: #1a202c; }
            
            .empty-state { color: #a0aec0; text-align: center; margin-top: 100px; font-style: italic; }

            @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>MQTT Backend Control</h1>
        </div>

        <div class="main-layout">
            <!-- Left: Send Action -->
            <div class="panel left-panel">
                <h2>📤 Send Action</h2>
                <form id="actionForm">
                    <div class="form-group">
                        <label for="imei">Device IMEI</label>
                        <input type="text" id="imei" name="imei" value="860123456789012" required>
                        <div id="targetTopic" style="margin-top:5px; font-size:11px; color:#718096; font-family:monospace;">Target: /tenants/revolt/devices/860123456789012/actions</div>
                    </div>
                    <div class="form-group">
                        <label for="actionSelect">Action Name</label>
                        <select id="actionSelect" required>
                            <option value="" disabled selected>Loading actions...</option>
                        </select>
                        <!-- Hidden input to store the text name if needed, or just use select value -->
                    </div>
                    <!-- Display details for clarity -->
                     <div class="form-group">
                        <label>Description</label>
                        <div id="actionDescription" style="font-size:13px; color:#666; font-style:italic;">Select an action...</div>
                    </div>

                    <div class="form-group">
                        <label for="payload">Payload (JSON)</label>
                        <textarea id="payload" name="payload" rows="6" required></textarea>
                    </div>
                    <button type="submit">Send Action</button>
                </form>
                <div id="result"></div>
            </div>

            <!-- Right: Live Data View -->
            <div class="panel right-panel">
                <!-- Topic List -->
                <div class="topic-list" id="topicList">
                    <div class="topic-header">Topics</div>
                    <div class="topic-item active" onclick="filterTopic('ALL')">
                        All Topics
                        <span class="topic-count" id="count-ALL">0</span>
                    </div>
                    <!-- Topics will be added here -->
                </div>

                <!-- Logs -->
                <div class="log-wrapper">
                    <div class="log-header">
                        <span id="currentFilter" style="font-weight:bold; color:#2d3748;">All Topics</span>
                        <button onclick="clearLogs()" style="width:auto; padding:5px 10px; font-size:12px; background:#e53e3e;">Clear Logs</button>
                    </div>
                    <div id="liveLogs" class="log-container">
                        <div class="empty-state">Waiting for device data...</div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            const socket = io();
            const logsContainer = document.getElementById('liveLogs');
            const topicListEl = document.getElementById('topicList');
            
            let allLogs = [];
            let activeTopic = 'ALL';
            let topicCounts = { 'ALL': 0 };

            socket.on('device_data', (data) => {
                storeLog(data);
                updateTopicList(data.topic);
                if (activeTopic === 'ALL' || activeTopic === data.topic) {
                    renderLog(data);
                }
            });

            function storeLog(data) {
                // Formatting
                data.formattedTime = new Date(data.timestamp).toLocaleTimeString();
                try {
                    const parsed = JSON.parse(data.message);
                    data.formattedMessage = JSON.stringify(parsed, null, 2);
                } catch(e) {
                    data.formattedMessage = data.message;
                }
                
                allLogs.unshift(data); 
                if (allLogs.length > 500) allLogs.pop();
                
                // Counts
                topicCounts['ALL']++;
                topicCounts[data.topic] = (topicCounts[data.topic] || 0) + 1;
                updateCounts();
            }

            function updateTopicList(newTopic) {
                const existing = document.getElementById(\`topic-\${btoa(newTopic)}\`);
                if (!existing) {
                    const div = document.createElement('div');
                    div.className = 'topic-item';
                    div.id = \`topic-\${btoa(newTopic)}\`;
                    div.onclick = () => filterTopic(newTopic);
                    div.innerHTML = \`
                        \${newTopic}
                        <span class="topic-count" id="count-\${btoa(newTopic)}">1</span>
                    \`;
                    topicListEl.appendChild(div);
                }
            }

            function updateCounts() {
                document.getElementById('count-ALL').innerText = topicCounts['ALL'];
                for (const topic in topicCounts) {
                    if (topic === 'ALL') continue;
                    const el = document.getElementById(\`count-\${btoa(topic)}\`);
                    if (el) el.innerText = topicCounts[topic];
                }
            }

            function createLogDiv(data) {
                const div = document.createElement('div');
                div.className = 'log-entry';
                div.innerHTML = \`
                    <div class="log-meta">
                        <span>\${data.formattedTime}</span>
                    </div>
                    <div class="log-topic">\${data.topic}</div>
                    <div class="log-content">\${data.formattedMessage}</div>
                \`;
                return div;
            }

            function renderLog(data) { 
                // Prepend for live update
                 const empty = logsContainer.querySelector('.empty-state');
                 if (empty) empty.remove();
                 logsContainer.insertBefore(createLogDiv(data), logsContainer.firstChild);
            }

            function renderList(list) {
                // Clear and append for filter switch
                logsContainer.innerHTML = '';
                if (list.length === 0) {
                     logsContainer.innerHTML = '<div class="empty-state">No logs for this topic</div>';
                     return;
                }
                list.forEach(data => {
                    logsContainer.appendChild(createLogDiv(data));
                });
            }

            function filterTopic(topic) {
                activeTopic = topic;
                
                document.querySelectorAll('.topic-item').forEach(el => el.classList.remove('active'));
                if (topic === 'ALL') {
                    if(document.querySelector('.topic-item')) 
                        document.querySelector('.topic-item').classList.add('active');
                } else {
                    const el = document.getElementById(\`topic-\${btoa(topic)}\`);
                    if(el) el.classList.add('active');
                }
                
                document.getElementById('currentFilter').innerText = topic === 'ALL' ? 'All Topics' : topic;

                const filtered = topic === 'ALL' ? allLogs : allLogs.filter(l => l.topic === topic);
                renderList(filtered);
            }

            function clearLogs() {
                allLogs = [];
                topicCounts = { 'ALL': 0 };
                document.getElementById('count-ALL').innerText = '0';
                
                // Remove all topic items except "All Topics" (first child)
                while (topicListEl.children.length > 2) { 
                    topicListEl.removeChild(topicListEl.lastChild);
                }

                logsContainer.innerHTML = '<div class="empty-state">Waiting for device data...</div>';
            }



            // --- Send Action Logic ---
            const actionSelect = document.getElementById('actionSelect');
            const payloadInput = document.getElementById('payload');
            const descDiv = document.getElementById('actionDescription');
            const imeiInput = document.getElementById('imei');
            const topicDiv = document.getElementById('targetTopic');
            
            // Update topic on IMEI change
            function updateTopic() {
                const imei = imeiInput.value.trim() || '{imei}';
                topicDiv.textContent = 'Target: /tenants/revolt/devices/' + imei + '/actions';
            }
            imeiInput.addEventListener('input', updateTopic);
            
            let loadedActions = [];

            // Load Actions on Startup
            async function loadActions() {
                try {
                    const res = await fetch('/api/actions');
                    loadedActions = await res.json();
                    
                    actionSelect.innerHTML = '<option value="" disabled selected>Select an action...</option>';
                    
                    loadedActions.forEach(act => {
                        const opt = document.createElement('option');
                        opt.value = act.action_name;
                        opt.textContent = act.action_name;
                        actionSelect.appendChild(opt);
                    });
                } catch (e) {
                    console.error('Failed to load actions', e);
                    actionSelect.innerHTML = '<option value="" disabled>Error loading actions</option>';
                }
            }
            loadActions();

            // Populate Payload/Desc on Change
            actionSelect.addEventListener('change', () => {
                const actName = actionSelect.value;
                const action = loadedActions.find(a => a.action_name === actName);
                if (action) {
                    descDiv.textContent = action.details || 'No description';
                    // Format JSON payload nicely
                    try {
                        const parsed = (typeof action.payload === 'string') ? JSON.parse(action.payload) : action.payload;
                        payloadInput.value = JSON.stringify(parsed, null, 2);
                    } catch(e) {
                         payloadInput.value = action.payload;
                    }
                }
            });

            document.getElementById('actionForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const resultDiv = document.getElementById('result');
                resultDiv.style.display = 'none';
                
                try {
                    const payloadText = payloadInput.value;
                    let payload;
                    try {
                        payload = JSON.parse(payloadText);
                    } catch (err) {
                        alert('Invalid JSON in payload');
                        return;
                    }

                    const response = await fetch('/api/send-action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            imei: document.getElementById('imei').value,
                            name: actionSelect.value, // Use select value
                            payload: payload
                        })
                    });
                    
                    const data = await response.json();
                    
                    resultDiv.style.display = 'block';
                    if (data.success) {
                        resultDiv.className = 'success';
                        resultDiv.textContent = '✅ Action sent! ID: ' + data.actionId;
                    } else {
                        resultDiv.className = 'error';
                        resultDiv.textContent = '❌ Error: ' + data.error;
                    }
                } catch (err) {
                    resultDiv.style.display = 'block';
                    resultDiv.className = 'error';
                    resultDiv.textContent = '❌ Request failed: ' + err.message;
                }
            });
        </script>
    </body>
    </html>
    `);
});

app.get('/api/actions', async (req, res) => {
    try {
        const { getAvailableActions } = require('./actionStore');
        const actions = await getAvailableActions();
        res.json(actions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch actions' });
    }
});

app.post('/api/send-action', (req, res) => {
    try {
        const { imei, name, payload } = req.body;

        if (!imei || !name || !payload) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        console.log(`Received request to send action '${name}' to device ${imei}`);
        const actionId = sendAction(imei, name, payload);

        res.json({ success: true, actionId });
    } catch (error) {
        console.error('Error sending action:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Backend server running at http://localhost:${PORT}`);
});
