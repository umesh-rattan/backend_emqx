const { randomUUID } = require('crypto');
const client = require('./mqttClient');
const config = require('./config');
const db = require('./actionStore');

function sendAction(imei, name, payload) {
  const actionId = randomUUID();

  const topic = `/tenants/${config.tenant}/devices/${imei}/actions`;
  const messagePayload = JSON.stringify({ id: actionId, name, payload });

  client.publish(
    topic,
    messagePayload,
    { qos: 1 }
  );

  // Log to DB
  db.logActionTrigger(actionId, imei, topic, messagePayload);

  return actionId;
}

module.exports = { sendAction };


