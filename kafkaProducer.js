const { producer } = require('./ServiceKafkaClient');

// Buffer to store messages before sending them as a batch
let globalArray = [];
// Define the batch size and flush interval
const BATCH_SIZE = 5;         // Max number of messages per batch
const FLUSH_INTERVAL = 5000;    // Time interval to flush the batch (in ms)

let counter = 0;
const produceMessage = async (msg) => {
    // We use the IMEI as the key for Kafka if available, otherwise just unknown
    const key = msg.imei ? String(msg.imei) : 'unknown';
    // We convert the whole JSON message to a string payload
    const value = JSON.stringify(msg);

    if (key && value) {
        globalArray.push({ key, value });
    }

    // Check if the buffer is full
    if (globalArray.length >= BATCH_SIZE) {
        counter++;

        // Extract batch from global array
        const batchToSend = globalArray.slice(0, BATCH_SIZE);

        // Remove the sent messages from the global array
        globalArray.splice(0, batchToSend.length);

        await flushMessages(batchToSend);  // Send the messages if batch size is reached
    }
};

// Function to send batched messages
const flushMessages = async (batchArray) => {
    if (batchArray.length === 0) return;  // No messages to send

    try {
        console.log("counter batch " + counter);

        // Send all messages in the buffer as a batch
        await producer.connect();
        let kafkaresult = await producer.send({
            topic: 'RevoltBikeRawDataPoc.v2',
            messages: batchArray,
        });

        console.log("batch array length and below data " + batchArray.length);
        console.log('Batch sent successfully');

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
    if (globalArray.length > 0) {
        const batchToSend = globalArray.slice(0, globalArray.length);
        globalArray.splice(0, batchToSend.length);
        await flushMessages(batchToSend);
    }
}, FLUSH_INTERVAL);

module.exports = { produceMessage };
