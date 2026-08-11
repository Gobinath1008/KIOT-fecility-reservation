const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key && !key.startsWith('#')) {
        process.env[key] = value;
      }
    }
  });
}

const host = process.env.MYSQL_HOST || 'localhost';
const port = parseInt(process.env.MYSQL_PORT || '3306');
const database = process.env.MYSQL_DATABASE || 'hallbooking';
const username = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || '';

const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  dialect: 'mysql',
  logging: console.log
});

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected successfully to MySQL.');

    // Add column to roombooking table
    try {
      await sequelize.query("ALTER TABLE roombooking ADD COLUMN foodOption VARCHAR(191) DEFAULT 'normal';");
      console.log("Successfully added column 'foodOption' to roombooking table.");
    } catch (e) {
      console.log("Could not alter roombooking table:", e.message);
    }

    // Add column to booking table
    try {
      await sequelize.query("ALTER TABLE booking ADD COLUMN foodOption VARCHAR(191) DEFAULT 'normal';");
      console.log("Successfully added column 'foodOption' to booking table.");
    } catch (e) {
      console.log("Could not alter booking table:", e.message);
    }

  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    await sequelize.close();
  }
}

run();
