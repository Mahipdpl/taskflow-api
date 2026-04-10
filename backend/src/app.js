// src/app.js
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const swaggerUi  = require('swagger-ui-express');
const swaggerDef = require('./config/swagger');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, globalError } = require('./middleware/errorHandler');

// Route modules
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');

const app = express();

// ────────────────────────────────────────────
//  Security middleware
// ────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: '*',
}));

// ────────────────────────────────────────────
//  Request parsing
// ────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));       // Prevent huge payloads
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ────────────────────────────────────────────
//  Logging
// ────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ────────────────────────────────────────────
//  Health check (no auth, no rate limit)
// ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ────────────────────────────────────────────
//  API Documentation
// ────────────────────────────────────────────
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDef, {
    customSiteTitle: 'TaskFlow API Docs',
    customCss: '.swagger-ui .topbar { background: #0f172a; }',
    swaggerOptions: { persistAuthorization: true },
  })
);

// ────────────────────────────────────────────
//  API v1 routes
// ────────────────────────────────────────────
app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth',  authRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/users', userRoutes);

// ────────────────────────────────────────────
//  Error handlers (must be last)
// ────────────────────────────────────────────
app.use(notFound);
app.use(globalError);

module.exports = app;
