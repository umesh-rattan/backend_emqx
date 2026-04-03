require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.MYSQL_HOST,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
        });

        const [rows] = await pool.query('SHOW CREATE TABLE poc_new_bike_telemetry');
        fs.writeFileSync('schema.sql', rows[0]['Create Table']);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
