import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';

import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import agentRoutes from './routes/agent.js';
import sidebarRoutes from './routes/sidebar.js';
import reviewRoutes from './routes/reviews.js';
import userRoutes from './routes/users.js';

const app = express();

/* CORS */

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

/* Body parsing */

app.use(express.json({ limit: '5mb' }));

/* Sessions */

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  rolling: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 30 * 60,
    touchAfter: 0,
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 30 * 60 * 1000,
  },
}));

/* Routes */

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api', sidebarRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);

export default app;
