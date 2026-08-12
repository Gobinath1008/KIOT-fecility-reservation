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

    // Add columns to hallbooking table
    try {
      await sequelize.query("ALTER TABLE hallbooking ADD COLUMN includeChiefGuest TINYINT(1) DEFAULT 0;");
      console.log("Successfully added column 'includeChiefGuest' to hallbooking table.");
    } catch (e) {
      console.log("Could not add includeChiefGuest to hallbooking table:", e.message);
    }

    try {
      await sequelize.query("ALTER TABLE hallbooking ADD COLUMN normalFoodCount INT DEFAULT 0;");
      console.log("Successfully added column 'normalFoodCount' to hallbooking table.");
    } catch (e) {
      console.log("Could not add normalFoodCount to hallbooking table:", e.message);
    }

    try {
      await sequelize.query("ALTER TABLE hallbooking ADD COLUMN specialFoodCount INT DEFAULT 0;");
      console.log("Successfully added column 'specialFoodCount' to hallbooking table.");
    } catch (e) {
      console.log("Could not add specialFoodCount to hallbooking table:", e.message);
    }

    // Add columns to booking table
    try {
      await sequelize.query("ALTER TABLE booking ADD COLUMN includeChiefGuest TINYINT(1) DEFAULT 0;");
      console.log("Successfully added column 'includeChiefGuest' to booking table.");
    } catch (e) {
      console.log("Could not add includeChiefGuest to booking table:", e.message);
    }

    try {
      await sequelize.query("ALTER TABLE booking ADD COLUMN normalFoodCount INT DEFAULT 0;");
      console.log("Successfully added column 'normalFoodCount' to booking table.");
    } catch (e) {
      console.log("Could not add normalFoodCount to booking table:", e.message);
    }

    try {
      await sequelize.query("ALTER TABLE booking ADD COLUMN specialFoodCount INT DEFAULT 0;");
      console.log("Successfully added column 'specialFoodCount' to booking table.");
    } catch (e) {
      console.log("Could not add specialFoodCount to booking table:", e.message);
    }

  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    await sequelize.close();
  }
}

run();
