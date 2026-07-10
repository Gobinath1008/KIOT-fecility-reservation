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

    // Update all users in the `user` table to have default permissions set properly
    const defaultPermissions = {
      hallAccess: true,
      guestRoomAccess: true,
      vehicleAccess: true,
      canBook: true,
      canCancel: true,
      bookingLimit: 10,
      blocked: false,
      blockReason: ""
    };

    // Update gobi and others
    const [result] = await connection.execute(
      "UPDATE `user` SET `permissions` = ? WHERE `permissions` IS NULL OR `permissions` = '{}' OR JSON_EXTRACT(`permissions`, '$.hallAccess') = false OR JSON_EXTRACT(`permissions`, '$.hallAccess') IS NULL",
      [JSON.stringify(defaultPermissions)]
    );
    console.log('Update result:', result);

    const [rows] = await connection.execute("SELECT name, email, role, permissions FROM `user`");
    console.log('UPDATED USERS:', JSON.stringify(rows, null, 2));

    await connection.end();
  } catch (err) {
    console.error('MySQL Error:', err);
  }
}
run();
