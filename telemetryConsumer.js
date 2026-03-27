const client = require('./mqttClient');
const db = require('./telemetryStore');

client.on('message', async (topic, payload) => {
  if (!topic.includes('/events/all_data/jsonarray')) return;

  try {
    const messages = JSON.parse(payload.toString());
    console.log(`Received ${messages.length} messages`);

    for (const msg of messages) {
      if (!msg.imei) {
        console.warn('Skipping message without IMEI');
        continue;
      }

      // Deduplication (Optional, enables idempotent processing)
      const alreadyProcessed = await db.isDuplicate(msg.imei, msg.sequence);
      if (alreadyProcessed) {
        console.log(`Duplicate message skipped: IMEI ${msg.imei} Seq ${msg.sequence}`);
        continue;
      }

      // Durable storage
      await db.saveTelemetry(msg);
    }
  } catch (err) {
    console.error('Error processing MQTT message:', err);
  }
});
