import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ═══════════════════════════════════════════════════════════
// SECURITY & PARSING MIDDLEWARE
// ═══════════════════════════════════════════════════════════

// Security headers
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS — Allow both frontend (5173) and admin (5174), plus configured origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
].filter(Boolean);

if (process.env.CLIENT_URL && process.env.CLIENT_URL.includes(',')) {
  allowedOrigins.push(...process.env.CLIENT_URL.split(',').map(s => s.trim()));
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy blocked access from origin: ${origin}`), false);
  },
  credentials: true, // Allow cookies (refresh token)
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Stricter rate limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ═══════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════

// Health check (public)
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'Backend is running', timestamp: new Date().toISOString() });
});

// Auth routes (login/register have stricter rate limits)
app.use('/api/v1/auth', authRoutes);

// Admin API routes (all protected by JWT in the router)
app.use('/api/v1/admin', adminRoutes);

// ═══════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY ROUTES
// These map the old /api/* endpoints the frontend currently uses
// to the new /api/v1/admin/* handlers, so nothing breaks during migration.
// ═══════════════════════════════════════════════════════════
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// ═══════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════
app.use(errorHandler);

// ═══════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`🔐 Auth API:     http://localhost:${PORT}/api/v1/auth`);
  console.log(`📊 Admin API:    http://localhost:${PORT}/api/v1/admin\n`);
});

export default app;
