const { Kafka } = require('kafkajs');
const fs = require('fs');

// We use an environment variable for brokers, defaulting to localhost if not provided
// const brokers = process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'];

const kafka = new Kafka({
  clientId: 'backend_emqx',
  brokers: [
    'b-1.prodbikedatacluster.3s8m4x.c2.kafka.ap-south-1.amazonaws.com:9094',
    'b-2.prodbikedatacluster.3s8m4x.c2.kafka.ap-south-1.amazonaws.com:9094',
    'b-3.prodbikedatacluster.3s8m4x.c2.kafka.ap-south-1.amazonaws.com:9094'
  ],
  ssl: {
    rejectUnauthorized: false,
    ca: [fs.readFileSync('./kafkacerts/ca.crt', 'utf-8')],
    key: fs.readFileSync('./kafkacerts/client.key', 'utf-8'),
    cert: fs.readFileSync('./kafkacerts/signed-certificate-form-acm.pem', 'utf-8')
  },
});

const producer = kafka.producer();
// Using a consumer group specific to saving to DB
const consumer = kafka.consumer({ groupId: 'telemetry-db-bulk-consumer' });

module.exports = { producer, consumer };
