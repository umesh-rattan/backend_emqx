const { consumer } = require('./ServiceKafkaClient');
const db = require('./telemetryStore');
const lookup = require('./lookupStore');

const run = async () => {
  await consumer.connect();
  // We subscribe to the topic the producer writes to
  await consumer.subscribe({ topic: 'RevoltBikeRawDataPoc.v2', fromBeginning: true });

  console.log('Kafka Consumer connected and listening for batches...');

  await consumer.run({
    eachBatchAutoResolve: false,
    eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
      try {
        if (batch.messages.length === 0) return;

        // The producer stringifies the json object into the value
        const payloadArray = batch.messages.map(msg => JSON.parse(msg.value.toString()));

        console.log(`Processing batch of ${payloadArray.length} messages from Kafka...`);

        // Perform the bulk DB operation using our new method
        await db.saveTelemetryBulk(payloadArray);

        // Perform the Bulk UPSERT to the "latest" DB table
        await lookup.upsertTelemetryLatestBulk(payloadArray);

        // Acknowledge the batch was processed successfully
        const lastOffset = batch.messages[batch.messages.length - 1].offset;
        resolveOffset(lastOffset);
        await commitOffsetsIfNecessary();
        await heartbeat();

        console.log(`Batch of ${payloadArray.length} saved successfully.`);
      } catch (err) {
        console.error('Error processing Kafka batch into DB:', err);
        // Throwing error causes kafkajs to retry processing the batch
        throw err;
      }
    },
  });
};

run().catch(console.error);
