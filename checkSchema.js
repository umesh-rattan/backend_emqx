const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const pool = mysql.createPool({
        host: process.env.LOOKUP_MYSQL_HOST || process.env.MYSQL_HOST,
        user: process.env.LOOKUP_MYSQL_USER || process.env.MYSQL_USER,
        password: process.env.LOOKUP_MYSQL_PASSWORD || process.env.MYSQL_PASSWORD,
        database: process.env.LOOKUP_MYSQL_DATABASE || 'lookup',
    });

    try {
        const [rows] = await pool.query("SHOW CREATE TABLE poc_new_bike_telemetry_latest");
        console.log(rows[0]['Create Table']);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();
