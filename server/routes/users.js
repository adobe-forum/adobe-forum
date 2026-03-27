import { Router } from 'express';
import User from '../models/user.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/users
 * Returns all users except the currently logged-in one.
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const users = await User.find(
      { _id: { $ne: req.user._id } },
      '_id firstName lastName email',
    );
    return res.json({ success: true, users });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
