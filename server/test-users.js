import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
      // Mocking what the endpoint does
      // req.user._id would be some ID
      const users = await User.find(
        { _id: { $ne: new mongoose.Types.ObjectId() } },
        '_id firstName lastName email',
      );
      console.log('Fetched users count:', users.length);
      console.log('All users:', users);
      process.exit(0);
    } catch (err) {
      console.error('Error fetching users:', err);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
