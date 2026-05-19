import User from '../models/user.js';

/**
 * requireAuth middleware
 *
 * Checks that a valid session exists, loads the user from the DB,
 * and attaches them to req.user. Returns 401 if not authenticated.
 */
export default async function requireAuth(req, res, next) {
  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const user = await User.findById(userId).select('-password -resetToken -resetTokenExpiry');

    if (!user) {
      // User was deleted after session was created
      req.session.destroy(() => { });
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    req.user = user;
    return next();
  } catch (err) {
    console.error('requireAuth error:', err);
    return res.status(500).json({ error: 'Authentication check failed.' });
  }
}
