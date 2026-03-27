require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Ensure table exists
// Table creation skipped as it exists manually
// async function init() { ... }

async function getAvailableActions() {
  const query = 'SELECT action_name, details, payload FROM poc_ecu_actions ORDER BY id ASC';
  try {
    const [rows] = await pool.query(query);
    return rows;
  } catch (err) {
    console.error('Error fetching actions from DB:', err);
    return [];
  }
}

async function logActionTrigger(actionId, imei, topic, payload) {
  const query = `
        INSERT INTO poc_triggers_actions (action_id, imei, topic, payload, status)
        VALUES (?, ?, ?, ?, 'SENT')
    `;
  try {
    // Ensure payload is string
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    await pool.query(query, [actionId, imei, topic, payloadStr]);
    console.log(`Action logged: ${actionId} for IMEI ${imei}`);
  } catch (err) {
    console.error('Error logging action trigger:', err);
  }
}

async function updateActionStatus({ action_id, state, progress, errors }, responseTopic = '') {
  console.log('[ACTION STATUS]', action_id, state, progress, errors);

  // Construct response object to store
  const responseObj = { state, progress, errors, timestamp: Date.now() };
  const responseStr = JSON.stringify(responseObj);

  const query = `
        UPDATE poc_triggers_actions 
        SET response = ?, response_topic = ?, status = ?
        WHERE action_id = ?
    `;

  try {
    await pool.query(query, [responseStr, responseTopic, state, action_id]);
    console.log(`Action updated: ${action_id} Status: ${state}`);
  } catch (err) {
    console.error('Error updating action status:', err);
  }
}

module.exports = {
  updateActionStatus,
  getAvailableActions,
  logActionTrigger
};
