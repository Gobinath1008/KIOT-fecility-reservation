const mysql = require('mysql2/promise');

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'gobiUK@008',
      database: 'hall_booking_system'
    });

    const tablesToDrop = [
      'halls',
      'vehicles',
      'users',
      'bookings',
      'messages'
    ];

    for (const table of tablesToDrop) {
      console.log(`Dropping table: ${table}...`);
      await connection.execute(`DROP TABLE IF EXISTS \`${table}\``);
    }

    console.log('Tables dropped successfully.');

    const [tables] = await connection.query('SHOW TABLES');
    console.log('REMAINING TABLES:', tables);

    await connection.end();
  } catch (err) {
    console.error('MySQL Error:', err);
  }
}
run();
