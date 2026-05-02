const { producer } = require('./ServiceKafkaClient');

// Buffers to store messages per topic before sending them as a batch
const topicBuffers = {};
// Define the batch size and flush interval
const BATCH_SIZE = 100;         // Max number of messages per batch
const FLUSH_INTERVAL = 5000;    // Time interval to flush the batch (in ms)

let counter = 0;
const produceMessage = async (msg, topicName = 'RevoltBikeRawDataPoc.v2') => {
    // We use the IMEI as the key for Kafka if available, otherwise just unknown
    const key = msg.imei ? String(msg.imei) : 'unknown';
    // We convert the whole JSON message to a string payload
    const value = JSON.stringify(msg);

    if (key && value) {
        if (!topicBuffers[topicName]) {
            topicBuffers[topicName] = [];
        }
        topicBuffers[topicName].push({ key, value });
    }

    // Check if the buffer is full
    if (topicBuffers[topicName] && topicBuffers[topicName].length >= BATCH_SIZE) {
        counter++;

        // Extract batch from global array
        const batchToSend = topicBuffers[topicName].slice(0, BATCH_SIZE);

        // Remove the sent messages from the global array
        topicBuffers[topicName].splice(0, batchToSend.length);

        await flushMessages(batchToSend, topicName);  // Send the messages if batch size is reached
    }
};

// Function to send batched messages
const flushMessages = async (batchArray, topicName) => {
    if (batchArray.length === 0) return;  // No messages to send

    try {
        console.log("counter batch " + counter);

        // Send all messages in the buffer as a batch
        await producer.connect();
        let kafkaresult = await producer.send({
            topic: topicName,
            messages: batchArray,
        });

        console.log("batch array length and below data " + batchArray.length);
        console.log('Batch sent successfully to ' + topicName);

    } catch (err) {
        console.error('Failed to send batch:', err);
    }
    // Note: Do not disconnect if you have frequent batches, or manage connect/disconnect outside
    // For now keeping it to match reference code
    finally {
        await producer.disconnect();
    }
};

// Set a timer to flush the messages based on the time interval
setInterval(async () => {
    for (const topicName in topicBuffers) {
        if (topicBuffers[topicName].length > 0) {
            const batchToSend = topicBuffers[topicName].slice(0, topicBuffers[topicName].length);
            topicBuffers[topicName].splice(0, batchToSend.length);
            await flushMessages(batchToSend, topicName);
        }
    }
}, FLUSH_INTERVAL);

module.exports = { produceMessage };
