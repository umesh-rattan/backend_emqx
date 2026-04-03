const client = require('./mqttClient');
const { produceMessage } = require('./kafkaProducer');

client.on('message', async (topic, payload) => {
  if (!topic.includes('/events/all_data/jsonarray')) return;

  try {
    const messages = JSON.parse(payload.toString());
    console.log("messages", messages);
    // console.log(`Received ${messages.length} messages`);

    for (const msg of messages) {
      if (!msg.imei) {
        console.warn('Skipping message without IMEI');
        continue;
      }

      // Push to Kafka batch producer
      await produceMessage(msg);
    }
  } catch (err) {
    console.error('Error processing MQTT message:', err);
  }
});
