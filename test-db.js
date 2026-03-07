import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log("✅ SUCCESS: Connected to database!");
        await connection.end();
    } catch (err) {
        console.error("❌ ERROR:", err.message);
    }
}
test();
