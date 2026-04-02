const client = require('./mqttClient');
const db = require('./actionStore');


client.on('message', async (topic, payload) => {
  if (!topic.includes('/action/status')) return;

  let statuses = JSON.parse(payload.toString());
  if (!Array.isArray(statuses)) {
    statuses = [statuses];
  }

  for (const status of statuses) {
    await db.updateActionStatus(status, topic);
  }
});

