// src/server.js
require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = parseInt(process.env.PORT) || 5000;

const start = async () => {
  // Verify DB connection before accepting traffic
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('❌ Cannot start server: database connection failed');
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║          TaskFlow API  v1.0.0            ║
╠══════════════════════════════════════════╣
║  🚀  Server  : http://localhost:${PORT}      ║
║  📄  Docs    : http://localhost:${PORT}/api-docs ║
║  🏥  Health  : http://localhost:${PORT}/health  ║
║  🌍  Env     : ${(process.env.NODE_ENV || 'development').padEnd(28)}║
╚══════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
    // Force close after 10s
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise Rejection:', reason);
  });
};

start();
