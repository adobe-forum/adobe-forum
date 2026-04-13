import User from '../models/user.js';

/**
 * requireAuth middleware
 *
 * Checks that a valid session exists, loads the user from the DB,
 * and attaches them to req.user. Returns 401 if not authenticated.
 */
export default async function requireAuth(req, res, next) {
  const userId = req.session?.userId;
  const sessionId = req.sessionID;
  const cookieHeader = req.headers.cookie;

  console.log('🔐 requireAuth middleware check:');
  console.log('  - Session ID:', sessionId || '❌ [MISSING]');
  console.log('  - Cookie header:', cookieHeader ? '✅ [PRESENT]' : '❌ [MISSING]');
  console.log('  - Session exists:', req.session ? '✅ YES' : '❌ NO');
  console.log('  - Session userId:', userId || '❌ [MISSING]');
  console.log('  - Full session object:', JSON.stringify(req.session, null, 2));

  if (!userId) {
    console.warn('❌ requireAuth FAILED: No userId in session');
    console.warn('   - If Cookie header is missing: browser did not send session cookie');
    console.warn('   - If Cookie header present but userId missing: session exists but empty');
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const user = await User.findById(userId).select('-password -resetToken -resetTokenExpiry');

    if (!user) {
      // User was deleted after session was created
      console.warn('❌ requireAuth FAILED: User not found in DB (was deleted?)', userId);
      req.session.destroy(() => { });
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    console.log('✅ requireAuth SUCCESS: User authenticated:', user.email);
    req.user = user;
    return next();
  } catch (err) {
    console.error('❌ requireAuth ERROR:', err);
    return res.status(500).json({ error: 'Authentication check failed.' });
  }
}
