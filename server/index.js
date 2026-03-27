import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required');
}

const PORT = Number(process.env.PORT) || 5000;

mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
