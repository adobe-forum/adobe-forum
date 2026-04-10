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

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

/* ── Body parsing ───────────────────────────────────────────────────────────── */

app.use(express.json({ limit: '5mb' }));

/* ── Sessions ───────────────────────────────────────────────────────────────── */

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  rolling: false, // session expiry is fixed from loginAt, not sliding
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 30 * 60,    // 30 minutes — hard expiry in MongoDB
    touchAfter: 0,   // never auto-extend TTL on touch
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 30 * 60 * 1000, // 30 minutes
  },
}));

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
