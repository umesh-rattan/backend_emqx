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
        <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
            <h1>MQTT Backend Control</h1>
            <a href="/dataviewer" style="background: #3182ce; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; transition: background 0.2s;">Open Dataviewer 📊</a>
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

app.get('/api/bulk-data', async (req, res) => {
    try {
        const { getBulkData } = require('./telemetryStore');
        const { imei, startDate, endDate, page, limit } = req.query;
        const data = await getBulkData({ imei, startDate, endDate, page: parseInt(page) || 1, limit: parseInt(limit) || 100 });
        res.json({ success: true, data });
    } catch (err) {
        console.error('Error fetching bulk data:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch bulk data' });
    }
});

app.get('/api/latest-data', async (req, res) => {
    try {
        const { getLatestData } = require('./lookupStore');
        const { imei, startDate, endDate, page, limit } = req.query;
        const data = await getLatestData({ imei, startDate, endDate, page: parseInt(page) || 1, limit: parseInt(limit) || 100 });
        res.json({ success: true, data });
    } catch (err) {
        console.error('Error fetching latest data:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch latest data' });
    }
});

app.get('/dataviewer', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dataviewer Dashboard</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg-color: #0f172a;
                --panel-bg: #1e293b;
                --text-main: #f8fafc;
                --text-muted: #94a3b8;
                --accent: #3b82f6;
                --accent-hover: #2563eb;
                --border: #334155;
            }
            body {
                font-family: 'Inter', sans-serif;
                background-color: var(--bg-color);
                color: var(--text-main);
                margin: 0;
                padding: 0;
                height: 100vh;
                display: flex;
                flex-direction: column;
            }
            .navbar {
                background-color: var(--panel-bg);
                padding: 15px 30px;
                display: flex;
                align-items: center;
                border-bottom: 1px solid var(--border);
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            }
            .navbar h1 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .container {
                display: flex;
                flex: 1;
                overflow: hidden;
                padding: 20px;
                gap: 20px;
            }
            .sidebar {
                width: 300px;
                background: var(--panel-bg);
                border-radius: 12px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 15px;
                border: 1px solid var(--border);
            }
            .form-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            label {
                font-size: 13px;
                font-weight: 500;
                color: var(--text-muted);
            }
            input {
                background: #0f172a;
                border: 1px solid var(--border);
                color: white;
                padding: 10px 12px;
                border-radius: 6px;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s;
            }
            input:focus {
                border-color: var(--accent);
            }
            button {
                background: var(--accent);
                color: white;
                border: none;
                padding: 12px;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s, transform 0.1s;
                margin-top: 10px;
            }
            button:hover {
                background: var(--accent-hover);
            }
            button:active {
                transform: scale(0.98);
            }
            .main-content {
                flex: 1;
                background: var(--panel-bg);
                border-radius: 12px;
                border: 1px solid var(--border);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .tabs {
                display: flex;
                border-bottom: 1px solid var(--border);
                background: rgba(15, 23, 42, 0.4);
            }
            .tab {
                padding: 15px 25px;
                cursor: pointer;
                font-weight: 500;
                color: var(--text-muted);
                border-bottom: 2px solid transparent;
                transition: all 0.2s;
            }
            .tab:hover {
                color: #e2e8f0;
                background: rgba(255,255,255,0.05);
            }
            .tab.active {
                color: var(--accent);
                border-bottom-color: var(--accent);
                background: transparent;
            }
            .table-container {
                flex: 1;
                overflow: auto;
                padding: 0;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
                font-size: 13px;
                white-space: nowrap;
            }
            thead {
                position: sticky;
                top: 0;
                background: #1e293b;
                z-index: 10;
                box-shadow: 0 1px 0 var(--border);
            }
            th, td {
                padding: 12px 15px;
                border-bottom: 1px solid var(--border);
            }
            th {
                color: var(--text-muted);
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-size: 11px;
            }
            tr:hover td {
                background: rgba(255,255,255,0.02);
            }
            .btn-view {
                background: transparent;
                border: 1px solid var(--accent);
                color: var(--accent);
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 12px;
                margin: 0;
            }
            .btn-view:hover {
                background: rgba(59, 130, 246, 0.1);
            }
            .modal-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(4px);
                display: none;
                justify-content: flex-end;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s;
            }
            .modal-overlay.open {
                display: flex;
                opacity: 1;
            }
            .drawer {
                background: var(--panel-bg);
                width: 450px;
                height: 100%;
                box-shadow: -4px 0 15px rgba(0,0,0,0.5);
                transform: translateX(100%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
            }
            .modal-overlay.open .drawer {
                transform: translateX(0);
            }
            .drawer-header {
                padding: 20px;
                border-bottom: 1px solid var(--border);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .drawer-header h2 {
                margin: 0;
                font-size: 18px;
            }
            .close-btn {
                background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer; padding: 0; margin: 0; line-height: 1;
            }
            .close-btn:hover { color: white; }
            .drawer-content {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }
            .kv-pair {
                display: flex;
                margin-bottom: 12px;
                border-bottom: 1px dashed var(--border);
                padding-bottom: 8px;
            }
            .kv-key {
                flex: 1;
                color: var(--text-muted);
                font-size: 13px;
            }
            .kv-val {
                flex: 1.5;
                font-weight: 500;
                font-size: 13px;
                word-break: break-all;
            }
            .pagination {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-top: 1px solid var(--border);
            }
            .pagination-info { font-size: 13px; color: var(--text-muted); }
            .pagination-controls { display: flex; gap: 10px; }
            .btn-icon { background: var(--border); padding: 6px 12px; margin: 0; color: white; }
            .btn-icon:disabled { opacity: 0.5; cursor: not-allowed; }
            .loader { text-align: center; padding: 40px; color: var(--text-muted); font-style: italic; }
        </style>
    </head>
    <body>
        <div class="navbar">
            <h1>Dataviewer Dashboard</h1>
        </div>
        <div class="container">
            <div class="sidebar">
                <div class="form-group">
                    <label>IMEI Search</label>
                    <input type="text" id="filter-imei" placeholder="e.g. 860123... (optional)">
                </div>
                <div class="form-group">
                    <label>Date From</label>
                    <input type="datetime-local" id="filter-start" step="1">
                </div>
                <div class="form-group">
                    <label>Date To</label>
                    <input type="datetime-local" id="filter-end" step="1">
                </div>
                <button onclick="applyFilters()">Search Data</button>
            </div>
            
            <div class="main-content">
                <div class="tabs">
                    <div class="tab active" onclick="switchTab('bulk')">Bulk Data (ecuData)</div>
                    <div class="tab" onclick="switchTab('latest')">Latest Data (Lookup DB)</div>
                </div>
                <div class="table-container" id="table-container">
                    <!-- Table injects here -->
                </div>
                <div class="pagination">
                    <div class="pagination-info" id="page-info">Page 1</div>
                    <div class="pagination-controls">
                        <button class="btn-icon" onclick="changePage(-1)" id="btn-prev">Previous</button>
                        <button class="btn-icon" onclick="changePage(1)" id="btn-next">Next</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal-overlay" id="drawerOverlay" onclick="closeDrawer(event)">
            <div class="drawer" onclick="event.stopPropagation()">
                <div class="drawer-header">
                    <h2>Record Details</h2>
                    <button class="close-btn" onclick="closeDrawer()">&times;</button>
                </div>
                <div class="drawer-content" id="drawer-content">
                    <!-- KV pairs inject here -->
                </div>
            </div>
        </div>

        <script>
            let currentTab = 'bulk';
            let currentPage = 1;
            let currentData = [];
            
            function formatDate(str) {
                if(!str) return '-';
                return new Date(str).toLocaleString();
            }

            function switchTab(tab) {
                document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
                event.target.classList.add('active');
                currentTab = tab;
                currentPage = 1;
                fetchData();
            }

            function applyFilters() {
                currentPage = 1;
                fetchData();
            }

            function changePage(delta) {
                if(currentPage + delta < 1) return;
                currentPage += delta;
                fetchData();
            }

            async function fetchData() {
                const imei = document.getElementById('filter-imei').value.trim();
                const start = document.getElementById('filter-start').value;
                const end = document.getElementById('filter-end').value;
                
                let startFormatted = start ? new Date(start).toISOString().slice(0, 19).replace('T', ' ') : '';
                let endFormatted = end ? new Date(end).toISOString().slice(0, 19).replace('T', ' ') : '';

                const container = document.getElementById('table-container');
                container.innerHTML = '<div class="loader">Loading data...</div>';

                const endpoint = currentTab === 'bulk' ? '/api/bulk-data' : '/api/latest-data';
                const query = new URLSearchParams({ page: currentPage, limit: 50 });
                if(imei) query.append('imei', imei);
                if(startFormatted) query.append('startDate', startFormatted);
                if(endFormatted) query.append('endDate', endFormatted);

                try {
                    const res = await fetch(endpoint + '?' + query.toString());
                    const json = await res.json();
                    if(json.success) {
                        currentData = json.data;
                        renderTable(json.data);
                        document.getElementById('page-info').textContent = 'Page ' + currentPage;
                        document.getElementById('btn-prev').disabled = currentPage === 1;
                        document.getElementById('btn-next').disabled = json.data.length < 50;
                    } else {
                        container.innerHTML = '<div class="loader">Error: ' + json.error + '</div>';
                    }
                } catch(e) {
                    container.innerHTML = '<div class="loader">Network Error. Check console.</div>';
                }
            }

            function renderTable(data) {
                const container = document.getElementById('table-container');
                if(!data || data.length === 0) {
                    container.innerHTML = '<div class="loader">No data found matching filters.</div>';
                    return;
                }

                const subsetColumns = ['timestamp', 'imei', 'sequence', 'latitude', 'longitude', 'speed', 'battery_voltage', 'status'];
                
                let html = '<table><thead><tr>';
                html += '<th>Actions</th>';
                subsetColumns.forEach(c => html += \'<th>\' + c + \'</th>\');
                html += '</tr></thead><tbody>';

                data.forEach((row, index) => {
                    html += '<tr>';
                    html += \'<td><button class="btn-view" onclick="viewDetails(\' + index + \')">View Details</button></td>\';
                    subsetColumns.forEach(c => {
                        let val = row[c];
                        if (c === 'timestamp') val = formatDate(val);
                        html += \'<td>\' + (val !== null && val !== undefined ? val : '-') + \'</td>\';
                    });
                    html += '</tr>';
                });

                html += '</tbody></table>';
                container.innerHTML = html;
            }

            function viewDetails(index) {
                const row = currentData[index];
                if(!row) return;

                const content = document.getElementById('drawer-content');
                let html = '';
                
                for(let key in row) {
                    let val = row[key];
                    if(val === null || val === '') val = '-';
                    if(key.includes('timestamp') || key.includes('Date')) val = formatDate(val) || val;
                    
                    html += \`
                        <div class="kv-pair">
                            <div class="kv-key">\${key}</div>
                            <div class="kv-val">\${val}</div>
                        </div>
                    \`;
                }
                content.innerHTML = html;
                
                const overlay = document.getElementById('drawerOverlay');
                overlay.style.display = 'flex';
                setTimeout(() => overlay.classList.add('open'), 10);
            }

            function closeDrawer(e) {
                if (e && e.target !== document.getElementById('drawerOverlay')) return;
                const overlay = document.getElementById('drawerOverlay');
                overlay.classList.remove('open');
                setTimeout(() => overlay.style.display = 'none', 300);
            }

            fetchData();
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
