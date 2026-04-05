const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const analyzeRoutes = require('./routes/analyze');
const dashboardRoutes = require('./routes/dashboard');
const historyRoutes = require('./routes/history');
const feedbackRoutes = require('./routes/feedback');

const app = express();

// --- Core Middleware ---
app.set('trust proxy', 1); // Trust first hop (e.g. Vite proxy, Nginx, etc)
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://smart-inbox-guard.netlify.app', // Common pattern for user
  'http://localhost:8001',
  'http://127.0.0.1:8001',
  'http://localhost:8080',
  'http://127.0.0.1:8080'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed list OR is a netlify subdomain
    const isAllowed = allowedOrigins.indexOf(origin) !== -1 || 
                     origin.endsWith('.netlify.app');
                     
    if (!isAllowed) {
      const msg = `The CORS policy for this site does not allow access from origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(globalLimiter);

// --- API Routes ---
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/analyze', analyzeRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/history', historyRoutes);
app.use('/api/v1/feedback', feedbackRoutes);

// --- 404 Handler ---
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

// --- Global Error Handler ---
app.use(errorHandler);

module.exports = app;
