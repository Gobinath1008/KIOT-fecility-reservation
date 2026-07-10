import { Sequelize } from 'sequelize';

const host = process.env.MYSQL_HOST || 'localhost';
const port = parseInt(process.env.MYSQL_PORT || '3306');
const database = process.env.MYSQL_DATABASE || 'hallbooking';
const username = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || '';

let cached = global.sequelize;
if (!cached) {
  cached = global.sequelize = { conn: null };
}

export function getSequelize() {
  if (cached.conn) {
    return cached.conn;
  }
  
  const sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect: 'mysql',
    logging: false, // Turn off query logging for cleaner console logs
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true
    }
  });

  cached.conn = sequelize;
  return sequelize;
}
