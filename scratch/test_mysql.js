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

    const [rows] = await connection.execute("SELECT * FROM `user`");
    console.log('USER TABLE IN MYSQL:', JSON.stringify(rows.map(r => ({ name: r.name, email: r.email, role: r.role, permissions: r.permissions })), null, 2));
    await connection.end();
  } catch (err) {
    console.error('MySQL Error:', err);
  }
}
run();
