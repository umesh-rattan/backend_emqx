require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function saveTelemetry(data) {
    const query = `
    INSERT INTO poc_new_bike_telemetry (
      timestamp, sequence, imei, iccid, msisdn, imsi, ble_mac,
      latitude, longitude, altitude, speed, azimuth, course,
      gps_odometer_m, can_odometer_m, rpm_odometer_m,
      satellites_gps, satellites_beidou, satellites_used,
      fix_type, fix_status, pdop, hdop, vdop, gps_fix_mode, gps_ttff_s,
      status, gsm_status, gps_status, bluetooth_status, csq, apn,
      modem_uptime_ms, controller_uptime_s,
      modem_app_version, modem_base_version, controller_version,
      battery_voltage, external_voltage, external_battery_voltage_mv, internal_battery_voltage_mv,
      internal_available_disk_size_bytes, external_available_disk_size_bytes,
      connected_device_name, connected_device_mac, analog_input1_mv,
      digital_output1_status, digital_output2_status, digital_input1_status, digital_input2_status,
      ignition_status, charging_status,
      engine_rpm, engine_coolant_temp, vehicle_speed, fuel_level_percent, throttle_position,
      event_data_name, event_data_value
    ) VALUES (?)
  `;

    // Map the object values to an array in the exact order of columns above
    const values = [
        data.timestamp,
        data.sequence,
        data.imei,
        data.iccid,
        data.msisdn,
        data.imsi,
        data.ble_mac,
        data.latitude,
        data.longitude,
        data.altitude,
        data.speed,
        data.azimuth,
        data.course,
        data.gps_odometer_m,
        data.can_odometer_m,
        data.rpm_odometer_m,
        data.satellites_gps,
        data.satellites_beidou,
        data.satellites_used,
        data.fix_type,
        data.fix_status,
        data.pdop,
        data.hdop,
        data.vdop,
        data.gps_fix_mode,
        data.gps_ttff_s,
        data.status,
        data.gsm_status,
        data.gps_status,
        data.bluetooth_status,
        data.csq,
        data.apn,
        data.modem_uptime_ms,
        data.controller_uptime_s,
        data.modem_app_version,
        data.modem_base_version,
        data.controller_version,
        data.battery_voltage,
        data.external_voltage,
        data.external_battery_voltage_mv,
        data.internal_battery_voltage_mv,
        data.internal_available_disk_size_bytes,
        data.external_available_disk_size_bytes,
        data.connected_device_name,
        data.connected_device_mac,
        data.analog_input1_mv,
        data.digital_output1_status,
        data.digital_output2_status,
        data.digital_input1_status,
        data.digital_input2_status,
        data.ignition_status,
        data.charging_status,
        data.engine_rpm,
        data.engine_coolant_temp,
        data.vehicle_speed,
        data.fuel_level_percent,
        data.throttle_position,
        data.event_data_name,
        data.event_data_value
    ];

    try {
        const [result] = await pool.query(query, [values]);
        console.log(`Telemetry saved for IMEI: ${data.imei}, Sequence: ${data.sequence}`);
        return result;
    } catch (error) {
        console.error('Error saving telemetry:', error);
        throw error;
    }
}

// Check for duplicates (optional implementation based on previous comments in consumer)
async function isDuplicate(imei, sequence) {
    const query = 'SELECT id FROM poc_new_bike_telemetry WHERE imei = ? AND sequence = ? LIMIT 1';
    const [rows] = await pool.query(query, [imei, sequence]);
    return rows.length > 0;
}

module.exports = {
    saveTelemetry,
    isDuplicate
};
