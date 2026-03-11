import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import Post from './models/Post.js';
import SidebarItem from './models/SidebarItem.js';
import User from './models/User.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required');
}

/* -------------------- MIDDLEWARE -------------------- */

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));

/* -------------------- SESSION -------------------- */

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60,
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

/* -------------------- DB -------------------- */

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 15000,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

/* -------------------- HELPERS -------------------- */

const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * requireAuth — UPGRADED
 *
 * Old behaviour: only checked req.session.userId, then called next().
 * New behaviour: fetches the full User from MongoDB and attaches it as
 * req.user so every protected route gets req.user._id, req.user.firstName,
 * etc. without needing its own extra database call.
 *
 * Also handles the edge case where the session exists but the user
 * account has since been deleted — destroys the stale session and
 * returns 401 so the browser clears the cookie.
 */
const requireAuth = async (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  try {
    const user = await User
      .findById(req.session.userId)
      .select('-password -resetToken -resetTokenExpiry');

    if (!user) {
      req.session.destroy(() => { });
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    req.user = user; // ← full user object attached here
    return next();
  } catch (err) {
    console.error('requireAuth error:', err);
    return res.status(500).json({ error: 'Authentication check failed.' });
  }
};

/**
 * buildTree — converts a flat array of SidebarItems into a nested tree.
 */
const buildTree = (items) => {
  const itemMap = new Map();
  const roots = [];

  items.forEach((item) => {
    const obj = item.toObject ? item.toObject() : item;
    obj.children = [];
    itemMap.set(String(obj._id), obj);
  });

  items.forEach((item) => {
    const id = String(item._id);
    const current = itemMap.get(id);
    if (item.parentId) {
      const parent = itemMap.get(String(item.parentId));
      if (parent) parent.children.push(current);
      else roots.push(current);
    } else {
      roots.push(current);
    }
  });

  return roots;
};

/* -------------------- AUTH -------------------- */

/**
 * POST /api/auth/register
 */
app.post('/api/auth/register', async (req, res) => {
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

    req.session.userId = String(user._id);

    const { password: _pw, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user.toObject();
    return res.status(201).json({ success: true, user: { ...safeUser, _id: String(user._id) } });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
});

/**
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req, res) => {
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

    req.session.userId = String(user._id);

    const { password: _pw, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user.toObject();
    return res.json({ success: true, user: { ...safeUser, _id: String(user._id) } });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sign-in failed.' });
  }
});

/**
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', (req, res) => {
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
 * req.user already attached by requireAuth — no extra DB call needed.
 */
app.get('/api/auth/me', requireAuth, (req, res) => {
  return res.json({ success: true, user: req.user });
});

/**
 * POST /api/auth/forgot-password
 */
app.post('/api/auth/forgot-password', async (req, res) => {
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

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    });

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
app.post('/api/auth/reset-password', async (req, res) => {
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


/* -------------------- AUTH — UPDATE PROFILE -------------------- */

/**
 * PATCH /api/auth/profile
 * Updates firstName and lastName for the logged-in user.
 */
app.patch('/api/auth/profile', async (req, res) => {
  try {
    const { userId, firstName, lastName } = req.body;

    if (!userId)
      return res.status(400).json({ error: 'User ID is required.' });

    if (!firstName || !firstName.trim())
      return res.status(400).json({ error: 'First name is required.' });

    if (!lastName || !lastName.trim())
      return res.status(400).json({ error: 'Last name is required.' });

    const user = await User.findByIdAndUpdate(
      userId,
      { firstName: firstName.trim(), lastName: lastName.trim(), updatedAt: Date.now() },
      { new: true },
    );

    if (!user) return res.status(404).json({ error: 'User not found.' });

    const { password: _pw, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user.toObject();
    return res.json({ success: true, user: safeUser });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Profile update failed.' });
  }
});

/**
 * PATCH /api/auth/change-password
 * Verifies the current password then updates to the new one.
 */
app.patch('/api/auth/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword)
      return res.status(400).json({ error: 'All fields are required.' });

    if (newPassword.length < 8)
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });

    const user = await User.findById(userId);
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

/* -------------------- POSTS -------------------- */

/**
 * POST /api/posts
 * Now saves req.user._id as createdBy.
 */
app.post('/api/posts', requireAuth, async (req, res) => {
  try {
    const { title, category, body, tags } = req.body;

    if (!title || !title.trim())
      return res.status(400).json({ error: 'Title is required' });
    if (title.length > 150)
      return res.status(400).json({ error: 'Title too long' });
    if (!category || !Array.isArray(tags) || !tags.length)
      return res.status(400).json({ error: 'Invalid payload' });

    const plainText = String(body).replace(/<[^>]*>/g, '').trim();
    if (plainText.length < 20)
      return res.status(400).json({ error: 'Body too short' });

    const post = await Post.create({
      title,
      category,
      body,
      tags,
      createdBy: req.user._id, // ← ownership recorded
    });

    res.status(201).json({ success: true, post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Post creation failed' });
  }
});

/**
 * GET /api/posts?page=1&limit=12&search=&author=
 *
 * Search covers: title, category, tags (partial), body (description),
 * and author name (firstName + lastName via a pre-query on User).
 * Author filter: pass ?author=<userId> to show only that user's posts (My Posts).
 */
app.get('/api/posts', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 12);
    const search = req.query.search?.trim();
    const author = req.query.author?.trim(); // for "My Posts" filter

    let query = {};

    // Apply author filter first (My Posts)
    if (author) {
      query.createdBy = mongoose.Types.ObjectId.isValid(author)
        ? new mongoose.Types.ObjectId(author)
        : author;
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');

      // Find users whose first or last name matches the search term.
      // Only _id is selected to keep this lightweight.
      const matchingUsers = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          // Also match full name e.g. "Nehal V" or just the initial "V"
          {
            $expr: {
              $regexMatch: {
                input: { $concat: ['$firstName', ' ', '$lastName'] },
                regex: escapeRegex(search),
                options: 'i',
              },
            },
          },
        ],
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { title: searchRegex },                         // post title
        { category: searchRegex },                      // category name
        { tags: searchRegex },                          // tags (partial match)
        { body: searchRegex },                          // post body / description
        ...(userIds.length > 0                          // author name
          ? [{ createdBy: { $in: userIds } }]
          : []),
      ];
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Post.countDocuments(query),
    ]);

    res.json({
      success: true,
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalCount: total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * GET /api/posts/:id
 */
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('createdBy', 'firstName lastName');

    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ success: true, post });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch post' });
  }
});

/**
 * POST /api/posts/:id/like
 * Toggle like for the current user
 */
app.post('/api/posts/:id/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const userId = req.user._id;
    const hasLiked = post.likes.includes(userId);

    // Toggle logic
    let updatedPost;
    if (hasLiked) {
      updatedPost = await Post.findByIdAndUpdate(
        req.params.id,
        { $pull: { likes: userId } },
        { new: true }
      ).populate('createdBy', 'firstName lastName');
    } else {
      updatedPost = await Post.findByIdAndUpdate(
        req.params.id,
        { $addToSet: { likes: userId } },
        { new: true }
      ).populate('createdBy', 'firstName lastName');
    }

    return res.json({ success: true, post: updatedPost });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update like status' });
  }
});

/**
 * PATCH /api/posts/:id
 * NEW endpoint. Ownership check — only the creator can edit.
 */
app.patch('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    if (String(post.createdBy) !== String(req.user._id))
      return res.status(403).json({ error: 'You can only edit your own posts.' });

    const { title, body, tags, category } = req.body;

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ error: 'Title is required' });
      if (title.length > 150) return res.status(400).json({ error: 'Title too long' });
      post.title = title.trim();
    }
    if (body !== undefined) {
      const plainText = String(body).replace(/<[^>]*>/g, '').trim();
      if (plainText.length < 20) return res.status(400).json({ error: 'Body too short' });
      post.body = body;
    }
    if (tags !== undefined) {
      if (!Array.isArray(tags) || !tags.length)
        return res.status(400).json({ error: 'Tags must be a non-empty array' });
      post.tags = tags;
    }
    if (category !== undefined) {
      if (!category.trim()) return res.status(400).json({ error: 'Category is required' });
      post.category = category.trim();
    }

    await post.save(); // pre-save hook sets updatedAt
    return res.json({ success: true, post });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Post update failed' });
  }
});

/* -------------------- SIDEBAR — ITEMS -------------------- */

/**
 * GET /api/sidebar-items/by-post/:postId
 * Returns the SidebarItem that links to a given post.
 * Used by forum-post to resolve sidebarItemId when the post was opened
 * from the cards view (which doesn't know the sidebar item).
 */
app.get('/api/sidebar-items/by-post/:postId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId))
      return res.status(400).json({ error: 'Invalid postId' });
    const item = await SidebarItem.findOne({
      postId: new mongoose.Types.ObjectId(req.params.postId),
      isFolder: false,
    });
    if (!item) return res.status(404).json({ error: 'No sidebar item found for this post' });
    // eslint-disable-next-line no-underscore-dangle
    return res.json({ success: true, sidebarItemId: String(item._id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Lookup failed' });
  }
});


/**
 * POST /api/sidebar-items
 * Now saves req.user._id as createdBy.
 */
app.post('/api/sidebar-items', requireAuth, async (req, res) => {
  try {
    const { title, category, postId, parentId = null, isFolder } = req.body;

    if (!title || !category)
      return res.status(400).json({ error: 'Invalid payload' });

    if (isFolder) {
      const duplicate = await SidebarItem.findOne({ title, category, parentId, isFolder: true });
      if (duplicate) return res.status(409).json({ error: 'A folder with that name already exists here.' });
    }

    const order = await SidebarItem.countDocuments({ parentId, category });

    const item = await SidebarItem.create({
      title,
      category,
      parentId,
      postId: isFolder ? null : postId,
      isFolder: Boolean(isFolder),
      order,
      createdBy: req.user._id, // ← ownership recorded
    });

    res.status(201).json({ success: true, item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sidebar item creation failed' });
  }
});

/**
 * POST /api/sidebar-items/smart-add
 * Leaf item gets createdBy. Category anchor stays null (shared resource).
 */
app.post('/api/sidebar-items/smart-add', requireAuth, async (req, res) => {
  try {
    const { title, category, postId, parentId = null } = req.body;

    if (!title || !category || !postId)
      return res.status(400).json({ error: 'Invalid payload' });
    if (parentId !== null && !mongoose.Types.ObjectId.isValid(parentId))
      return res.status(400).json({ error: 'Invalid payload' });

    const categoryName = category.trim();

    const anchorExists = await SidebarItem.findOne({
      category: categoryName, parentId: null, isFolder: true, title: categoryName,
    });

    if (!anchorExists) {
      const anchorOrder = await SidebarItem.countDocuments({ parentId: null });
      await SidebarItem.create({
        title: categoryName, category: categoryName,
        parentId: null, postId: null, isFolder: true,
        order: anchorOrder, createdBy: req.user._id,
      });
    }

    const resolvedParentId = parentId ? new mongoose.Types.ObjectId(parentId) : null;
    const existing = await SidebarItem.findOne({
      postId: new mongoose.Types.ObjectId(postId),
      category: categoryName,
      parentId: resolvedParentId,
    });
    if (existing) return res.status(200).json({ success: true, item: existing, duplicate: true });

    const order = await SidebarItem.countDocuments({ parentId: resolvedParentId, category: categoryName });

    const item = await SidebarItem.create({
      title: title.trim(), category: categoryName,
      parentId: resolvedParentId,
      postId: new mongoose.Types.ObjectId(postId),
      isFolder: false, order,
      createdBy: req.user._id, // ← ownership recorded
    });

    return res.status(201).json({ success: true, item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Smart-add failed' });
  }
});

/* -------------------- SIDEBAR — CATEGORIES -------------------- */

app.post('/api/sidebar/categories', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ error: 'Category name is required' });

    const categoryName = name.trim();

    const existing = await SidebarItem.findOne({
      category: categoryName, parentId: null, isFolder: true, title: categoryName,
    });
    if (existing) return res.status(409).json({ error: 'Category already exists' });

    const order = await SidebarItem.countDocuments({ parentId: null, category: categoryName });
    const item = await SidebarItem.create({
      title: categoryName, category: categoryName,
      parentId: null, postId: null, isFolder: true,
      order, createdBy: req.user._id,
    });

    res.status(201).json({ success: true, item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Category creation failed' });
  }
});

/**
 * GET /api/sidebar/categories
 * Public. Returns createdBy on each item so the frontend can
 * compare with the current user and conditionally show edit/delete buttons.
 */
app.get('/api/sidebar/categories', async (_req, res) => {
  try {
    const items = await SidebarItem.find()
      .populate('postId', '_id title category tags body')
      .sort({ category: 1, order: 1, createdAt: 1 });

    const groups = new Map();
    items.forEach((item) => {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category).push(item);
    });

    const categories = [];
    groups.forEach((categoryItems, categoryName) => {
      const rootAnchor = categoryItems.find(
        (i) => i.isFolder && i.parentId === null && i.title === categoryName,
      );
      const children = rootAnchor
        ? categoryItems.filter((i) => String(i._id) !== String(rootAnchor._id))
        : categoryItems;

      categories.push({
        id: rootAnchor
          ? String(rootAnchor._id)
          : categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: categoryName,
        icon: '',
        // eslint-disable-next-line no-underscore-dangle
        createdBy: rootAnchor ? (rootAnchor.createdBy ? String(rootAnchor.createdBy) : null) : null,
        items: buildTree(children),
      });
    });

    categories.sort((a, b) => a.name.localeCompare(b.name));
    return res.json({ success: true, categories, totalItems: items.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

/**
 * DELETE /api/sidebar/categories/:id
 * Only the creator may delete a category.
 * Blocked if any item inside belongs to a different user.
 * Cascade-deletes all SidebarItems AND Post documents in the category.
 */
app.delete('/api/sidebar/categories/:id', requireAuth, async (req, res) => {
  try {
    const root = await SidebarItem.findById(req.params.id);
    if (!root) return res.status(404).json({ error: 'Category not found' });

    const userId = String(req.user._id);

    if (root.createdBy && String(root.createdBy) !== userId)
      return res.status(403).json({ error: 'You can only delete categories you created.' });

    const allItems = await SidebarItem.find({ category: root.category });

    const blockedItem = allItems.find(
      (item) => item.createdBy && String(item.createdBy) !== userId,
    );
    if (blockedItem) {
      return res.status(403).json({
        error: `Cannot delete: "${blockedItem.title}" in this category was created by another user. Ask them to remove it first.`,
      });
    }

    const postIds = allItems.map((i) => i.postId).filter(Boolean);

    await SidebarItem.deleteMany({ category: root.category });
    if (postIds.length > 0) {
      await Post.deleteMany({ _id: { $in: postIds } });
    }

    return res.json({ success: true, deletedPosts: postIds.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Delete failed' });
  }
});

/* -------------------- SIDEBAR — RENAME -------------------- */

/**
 * PATCH /api/sidebar-items/:id
 * Ownership check added. createdBy null = legacy item, allow edit.
 */
app.patch('/api/sidebar-items/:id', requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim())
      return res.status(400).json({ error: 'Title is required' });

    const item = await SidebarItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (item.createdBy && String(item.createdBy) !== String(req.user._id))
      return res.status(403).json({ error: 'You can only rename items you created.' });

    item.title = title.trim();
    item.updatedAt = Date.now();
    await item.save();

    return res.json({ success: true, item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Rename failed' });
  }
});

/* -------------------- SIDEBAR — MOVE -------------------- */

/**
 * PATCH /api/sidebar-items/:id/move
 * Moves a sidebar item to a new category and/or parent folder.
 * Body: { category: string, parentId: string|null }
 */
app.patch('/api/sidebar-items/:id/move', requireAuth, async (req, res) => {
  try {
    const { category, parentId = null } = req.body;
    if (!category)
      return res.status(400).json({ error: 'category is required' });

    const item = await SidebarItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (item.createdBy && String(item.createdBy) !== String(req.user._id))
      return res.status(403).json({ error: 'You can only move items you created.' });

    let resolvedCategory;
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId))
        return res.status(400).json({ error: 'Invalid parentId' });
      const parent = await SidebarItem.findById(parentId);
      if (!parent) return res.status(404).json({ error: 'Destination folder not found' });
      if (!parent.isFolder)
        return res.status(400).json({ error: 'Destination must be a folder' });
      item.parentId = new mongoose.Types.ObjectId(parentId);
      resolvedCategory = parent.category;
    } else {
      item.parentId = null;
      resolvedCategory = category.trim();
    }

    item.category = resolvedCategory;
    item.updatedAt = Date.now();
    await item.save();

    if (item.postId) {
      await Post.findByIdAndUpdate(item.postId, { category: resolvedCategory });
    }

    return res.json({ success: true, item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Move failed' });
  }
});


/**
 * DELETE /api/sidebar-items/:id
 *
 * Rules:
 *   1. You must have created the root item.
 *   2. If ANY descendant in the subtree was created by a different user,
 *      the entire delete is blocked.
 */
app.delete('/api/sidebar-items/:id', requireAuth, async (req, res) => {
  try {
    const rootItem = await SidebarItem.findById(req.params.id);
    if (!rootItem) return res.status(404).json({ error: 'Item not found' });

    if (rootItem.createdBy && String(rootItem.createdBy) !== String(req.user._id))
      return res.status(403).json({ error: 'You can only delete items you created.' });

    const result = await SidebarItem.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $graphLookup: {
          from: 'sidebaritems',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentId',
          as: 'descendants',
        },
      },
      {
        $project: {
          allItems: {
            $concatArrays: [
              [{ id: '$_id', createdBy: '$createdBy', postId: '$postId', title: '$title' }],
              {
                $map: {
                  input: '$descendants',
                  as: 'd',
                  in: {
                    id: '$$d._id',
                    createdBy: '$$d.createdBy',
                    postId: '$$d.postId',
                    title: '$$d.title',
                  },
                },
              },
            ],
          },
        },
      },
    ]);

    if (!result.length) return res.status(404).json({ error: 'Item not found' });

    const { allItems } = result[0];
    const userId = String(req.user._id);

    const blockedItem = allItems.find(
      (item) => item.createdBy && String(item.createdBy) !== userId,
    );
    if (blockedItem) {
      return res.status(403).json({
        error: `Cannot delete: "${blockedItem.title}" inside this folder was created by another user. Ask them to remove it first.`,
      });
    }

    const allIds = allItems.map((item) => item.id);
    const allPostIds = allItems.map((item) => item.postId).filter(Boolean);

    await SidebarItem.deleteMany({ _id: { $in: allIds } });
    if (allPostIds.length > 0) {
      await Post.deleteMany({ _id: { $in: allPostIds } });
    }

    return res.json({ success: true, deletedPosts: allPostIds.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

/* -------------------- SERVER -------------------- */

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
