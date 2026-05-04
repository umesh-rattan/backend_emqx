const client = require('./mqttClient');
const { produceMessage } = require('./kafkaProducer');

client.on('message', async (topic, payload) => {
  let kafkaTopic = null;
  let isCanRaw = false;
  if (topic.includes('/events/all_data/jsonarray')) {
    kafkaTopic = 'RevoltBikeRawDataPoc.v2';
  } else if (topic.includes('/events/can_raw/jsonarray')) {
    kafkaTopic = 'RevoltBikeRawCanDataPoc.v2';
    isCanRaw = true;
  } else {
    return;
  }

  try {
    const messages = JSON.parse(payload.toString());

    let extractedImei = null;
    if (isCanRaw) {
      console.log(`Full topic name: ${topic}`);
      const match = topic.match(/\/devices\/([^/]+)/);
      if (match) {
        extractedImei = match[1];
      }
    }

    // console.log("messages", messages);
    //console.log(`Received ${messages.length} messages on ${topic}`);

    for (const msg of messages) {
      if (isCanRaw && extractedImei) {
        msg.imei = extractedImei;
      }

      if (!msg.imei) {
        console.warn('Skipping message without IMEI');
        continue;
      }

      // Push to Kafka batch producer
      await produceMessage(msg, kafkaTopic);
    }
  } catch (err) {
    console.error('Error processing MQTT message:', err);
  }
});
