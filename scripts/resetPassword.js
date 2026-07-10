const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');

const email = process.argv[2] || 'user@kiot.ac.in';
const newPassword = process.argv[3] || 'kiot@123';

const host = process.env.MYSQL_HOST || 'localhost';
const port = parseInt(process.env.MYSQL_PORT || '3306');
const database = process.env.MYSQL_DATABASE || 'hall_booking_system';
const username = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || 'gobiUK@008';

async function reset() {
  const sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect: 'mysql',
    logging: false
  });

  try {
    console.log(`Resetting password for ${email}...`);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const [result] = await sequelize.query(
      'UPDATE user SET password = ? WHERE email = ?',
      { replacements: [hashedPassword, email] }
    );

    if (result.affectedRows > 0) {
      console.log(`Successfully reset password for ${email} to: ${newPassword}`);
    } else {
      console.log(`No user found with email ${email}`);
    }
  } catch (error) {
    console.error('Failed to reset password:', error.message);
  } finally {
    await sequelize.close();
  }
}

reset();
