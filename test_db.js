require('dotenv').config();
const db = require('./telemetryStore');

const testData = {
    timestamp: 1704110400000,
    sequence: 999999, // usage of a high sequence to avoid conflict or just for test
    latitude: 28.6139,
    longitude: 77.209,
    altitude: 216.5,
    speed: 45.2,
    satellites_gps: 12,
    satellites_beidou: 5,
    satellites_used: 15,
    fix_type: 3,
    fix_status: 1,
    pdop: 1.2,
    hdop: 0.8,
    vdop: 1.0,
    azimuth: 45.6,
    course: 180.5,
    status: "On",
    battery_voltage: 3800,
    external_voltage: 12000,
    gps_fix_mode: 3,
    modem_app_version: "2.5.1",
    modem_base_version: "L511_base_v1.0",
    controller_version: "2.0.0",
    imei: "TestIMEI12345",
    iccid: "8910300000000000000F",
    ble_mac: "AA:BB:CC:DD:EE:FF",
    msisdn: "9876543210",
    gsm_status: 1,
    gps_status: 1,
    gps_ttff_s: 15,
    imsi: "404123456789012",
    apn: "internet",
    csq: 25,
    internal_available_disk_size_bytes: 1048576,
    external_available_disk_size_bytes: 2097152,
    modem_uptime_ms: 3600000,
    gps_odometer_m: 12345.5,
    can_odometer_m: 12340.0,
    rpm_odometer_m: 12342.0,
    external_battery_voltage_mv: 12000,
    internal_battery_voltage_mv: 3800,
    bluetooth_status: 1,
    connected_device_name: "BLE_Scanner",
    connected_device_mac: "AA:BB:CC:DD:EE:FF",
    analog_input1_mv: 1500,
    digital_output1_status: 1,
    digital_output2_status: 0,
    digital_input1_status: 1,
    digital_input2_status: 0,
    ignition_status: 1,
    charging_status: 0,
    controller_uptime_s: 1800,
    engine_rpm: 2500,
    engine_coolant_temp: 85,
    vehicle_speed: 45,
    fuel_level_percent: 65,
    throttle_position: 30,
    event_data_name: "test_event",
    event_data_value: "test_val"
};

async function runTest() {
    try {
        console.log('Testing DB Connection and Insert...');
        await db.saveTelemetry(testData);
        console.log('Successfully saved test data.');
        process.exit(0);
    } catch (error) {
        console.error('Failed to save test data:', error);
        process.exit(1);
    }
}

runTest();
