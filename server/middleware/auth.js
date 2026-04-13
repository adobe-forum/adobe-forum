import User from '../models/user.js';

/**
 * requireAuth middleware
 *
 * Checks that a valid session exists, loads the user from the DB,
 * and attaches them to req.user. Returns 401 if not authenticated.
 */
export default async function requireAuth(req, res, next) {
  const userId = req.session?.userId;

  console.log('🔐 requireAuth check:');
  console.log('  - Session ID:', req.sessionID);
  console.log('  - User ID from session:', userId);
  console.log('  - Full session:', JSON.stringify(req.session, null, 2));

  if (!userId) {
    console.warn('❌ No userId in session');
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const user = await User.findById(userId).select('-password -resetToken -resetTokenExpiry');

    if (!user) {
      // User was deleted after session was created
      console.warn('❌ User not found in DB (was deleted?)', userId);
      req.session.destroy(() => { });
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    console.log('✅ User authenticated:', user.email);
    req.user = user;
    return next();
  } catch (err) {
    console.error('❌ requireAuth error:', err);
    return res.status(500).json({ error: 'Authentication check failed.' });
  }
}
