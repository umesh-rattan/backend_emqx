const client = require('./mqttClient');
const db = require('./actionStore');


client.on('message', async (topic, payload) => {
  if (!topic.includes('/action/status')) return;

  const statuses = JSON.parse(payload.toString());

  for (const status of statuses) {
    await db.updateActionStatus(status, topic);
  }
});

