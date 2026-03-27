const { sendAction } = require('./actionService');
const imei = '860123456789012';

const actionId = sendAction(
  imei,
  'set_digital_output',
  {
    output_num: 1,
    output_state: 1
  }
);

console.log('📤 Action sent. Action ID:', actionId);
