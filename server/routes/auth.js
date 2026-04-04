import { Router } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import requireAuth from '../middleware/auth.js';
import transporter from '../helpers/mailer.js';

const router = Router();

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !firstName.trim())
      return res.status(400).json({ error: 'First name is required.' });
    if (!lastName || !lastName.trim())
      return res.status(400).json({ error: 'Last name is required.' });
    if (!email || !email.trim())
      return res.status(400).json({ error: 'Email address is required.' });
    if (!password || password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const ADOBE_DOMAINS = ['adobe.com', 'adobetest.com', 'adobeforums.com', 'adobecorp.com'];
    const domain = email.trim().toLowerCase().split('@')[1] || '';
    const isAdobe = ADOBE_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
    if (!isAdobe)
      return res.status(400).json({ error: 'Only Adobe corporate email addresses are allowed.' });

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing)
      return res.status(409).json({ error: 'An account with this email already exists.' });

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    const loginAt = Date.now();
    req.session.userId = String(user._id);
    req.session.loginAt = loginAt;

    await User.findByIdAndUpdate(user._id, { $set: { loginAt: new Date(loginAt) } }, { strict: false });

    await new Promise((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve()))
    );

    const { password: _pw, resetToken: _rt, resetTokenExpiry: _rte, createdAt: _ca, updatedAt: _ua, ...safeUser } = user.toObject();
    return res.status(201).json({ success: true, user: { ...safeUser, _id: String(user._id) }, loginAt });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const match = await user.comparePassword(password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const loginAt = Date.now();
    req.session.userId = String(user._id);
    req.session.loginAt = loginAt;

    await User.findByIdAndUpdate(user._id, { $set: { loginAt: new Date(loginAt) } }, { strict: false });

    await new Promise((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve()))
    );

    const { password: _pw, resetToken: _rt, resetTokenExpiry: _rte, createdAt: _ca, updatedAt: _ua, ...safeUser } = user.toObject();
    return res.json({ success: true, user: { ...safeUser, _id: String(user._id) }, loginAt });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sign-in failed.' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Logout failed.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, (req, res) => {
  const loginAt = req.session.loginAt
    || (req.user.loginAt ? new Date(req.user.loginAt).getTime() : null);
  return res.json({ success: true, user: req.user, loginAt });
});

/**
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim())
      return res.status(400).json({ error: 'Email address is required.' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.json({ success: true });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
    const resetLink = `${clientOrigin}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"Adobe Forum" <${process.env.GMAIL_USER}>`,
      to: user.email,
      subject: 'Reset your Adobe Forum password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2>Reset your password</h2>
          <p>Hi ${user.firstName},</p>
          <p>Click the button below to reset your password. This link expires in <strong>30 minutes</strong>.</p>
          <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#da1f26;color:#fff;text-decoration:none;border-radius:4px;margin:16px 0">
            Reset Password
          </a>
          <p>If you did not request this, ignore this email.</p>
        </div>
      `,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not send reset link.' });
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password)
      return res.status(400).json({ error: 'Token and password are required.' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });

    user.password = password;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Password reset failed.' });
  }
});

/**
 * PATCH /api/auth/profile
 */
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    if (!firstName || !firstName.trim())
      return res.status(400).json({ error: 'First name is required.' });
    if (!lastName || !lastName.trim())
      return res.status(400).json({ error: 'Last name is required.' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { firstName: firstName.trim(), lastName: lastName.trim() },
      { new: true },
    );

    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { password: _pw, resetToken: _rt, resetTokenExpiry: _rte, createdAt: _ca, updatedAt: _ua, ...safeUser } = user.toObject();
    return res.json({ success: true, user: safeUser });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Profile update failed.' });
  }
});

/**
 * PATCH /api/auth/change-password
 */
router.patch('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'All fields are required.' });
    if (newPassword.length < 8)
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

    user.password = newPassword;
    await user.save();

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Password change failed.' });
  }
});

export default router;
