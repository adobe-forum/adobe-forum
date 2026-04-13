import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';

import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import sidebarRoutes from './routes/sidebar.js';
import reviewRoutes from './routes/reviews.js';
import userRoutes from './routes/users.js';

const app = express();

/* ── CORS ───────────────────────────────────────────────────────────────────── */

// In production, allow same-origin requests (frontend and backend on same domain)
// In development, allow localhost:3000
const clientOrigin = process.env.CLIENT_ORIGIN || process.env.NODE_ENV === 'production' ? '*' : 'http://localhost:3000';
console.log('🌐 CORS configured for origin:', clientOrigin);
console.log('📍 Environment:', process.env.NODE_ENV || 'development');

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    console.log('🔍 CORS check for origin:', origin);
    
    // In production, allow same-origin (frontend on same render.com domain)
    if (process.env.NODE_ENV === 'production') {
      console.log('✅ CORS allowing (production mode allows all)');
      callback(null, true); // Allow all origins in production (render.com handles same-origin)
    } else {
      // In development, only allow localhost
      if (origin === 'http://localhost:3000' || origin === 'http://localhost:5000') {
        console.log('✅ CORS allowing (whitelisted localhost)');
        callback(null, true);
      } else {
        console.log('❌ CORS BLOCKED:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie', 'X-Session-ID'], // Explicitly allow Set-Cookie to be exposed to client
}));

/* ── Body parsing ───────────────────────────────────────────────────────────── */

app.use(express.json({ limit: '5mb' }));

/* ── Sessions ───────────────────────────────────────────────────────────────── */

const store = MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  collectionName: 'sessions',
  ttl: 30 * 60,    // 30 minutes — hard expiry in MongoDB
  touchAfter: 0,   // never auto-extend TTL on touch
});

store.on('error', (err) => {
  console.error('⚠️ MongoStore error:', err.message);
});

store.on('connected', () => {
  console.log('✅ MongoStore connected to sessions collection');
});

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI not set! Session storage will not work properly.');
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: true,  // Allow session creation on first request
  rolling: false,           // session expiry is fixed from loginAt, not sliding
  store,
  proxy: process.env.NODE_ENV === 'production', // Trust proxy headers in production
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE === 'true', // HTTPS only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax', // 'lax' works better for Safari iOS same-origin, 'none' requires Secure + may fail on old Safari
    path: '/',  // Explicit path — required for Safari cookie handling
    domain: undefined, // Let browser handle domain for same-origin cookies (more reliable on Safari)
    maxAge: 30 * 60 * 1000, // 30 minutes
  },
}));

const NODE_ENV = process.env.NODE_ENV || 'development';
console.log('🔐 Session cookie config:', {
  sameSite: NODE_ENV === 'production' ? 'lax' : 'lax',
  secure: NODE_ENV === 'production' || process.env.FORCE_SECURE === 'true',
  httpOnly: true,
  path: '/',
  maxAge: '30 minutes',
  note: 'Using sameSite=lax for better Safari iOS compatibility',
});

console.log('🔐 Session cookie config:', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE === 'true',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: '30 minutes',
});

// Debug middleware to log session creation
app.use((req, res, next) => {
  const userId = req.session?.userId;
  const cookieHeader = req.headers.cookie;
  
  // Detailed logging for auth endpoint
  if (req.path === '/api/auth/me' && req.method === 'GET') {
    console.log('📡 [AUTH CHECK] GET /api/auth/me');
    console.log('   Session ID:', req.sessionID || '❌ [MISSING]');
    console.log('   Session exists:', req.session ? '✅' : '❌');
    console.log('   User ID in session:', userId || '❌ [EMPTY]');
    console.log('   Cookie header present:', cookieHeader ? '✅' : '❌ [MISSING - browser not sending cookie!]');
    console.log('   Full Cookie:', cookieHeader || '[NONE]');
  }
  
  console.log('📝 Request:', req.method, req.path);
  console.log('   Session ID:', req.sessionID);
  console.log('   User ID:', userId || 'none');
  console.log('   Cookie header:', req.headers.cookie ? '[present]' : '[missing]');
  next();
});

/* ── Routes ─────────────────────────────────────────────────────────────────── */

// Health check endpoint for monitoring and load balancers
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Adobe Forum API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', sidebarRoutes);       // sidebar routes use mixed prefixes (/api/sidebar-items and /api/sidebar)
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

export default app;
