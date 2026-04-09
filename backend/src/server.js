// src/server.js
require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT) || 5000;

const initDB = async () => {
  try {
    // Try to create tables from schema.sql if they don't exist
    const schemaPath = path.join(__dirname, '..', '..', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('✅ Database schema initialized');
    }
    return true;
  } catch (err) {
    // Tables might already exist — that's fine
    if (err.code === '42P07' || err.message.includes('already exists')) {
      console.log('✅ Database tables already exist');
      return true;
    }
    console.error('❌ Cannot start server: database connection failed');
    console.error(err.message);
    return false;
  }
};

const start = async () => {
  const dbOk = await initDB();
  if (!dbOk) {
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════╗
║       TaskFlow API  v1.0.0         ║
╠════════════════════════════════════╣
║  Server : http://localhost:${PORT}   ║
╚════════════════════════════════════╝
    `);
  });
};

start();
