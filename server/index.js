import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
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

// Escapes special characters in a string for safe use inside a RegExp
const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * buildTree — converts a flat array of SidebarItems into a nested tree.
 *
 * Each item with a parentId is attached as a child of its parent.
 * Items whose parentId is missing or points to a non-existent parent
 * are promoted to root level so nothing is silently lost.
 *
 * @param {Array} items - Mongoose documents or plain objects
 * @returns {Array} Root-level nodes, each with a populated `children` array
 */
const buildTree = (items) => {
  const itemMap = new Map();
  const roots = [];

  // First pass: index every item by its string _id and initialise children
  items.forEach((item) => {
    const obj = item.toObject ? item.toObject() : item;
    obj.children = [];
    itemMap.set(String(obj._id), obj);
  });

  // Second pass: wire children to their parents, or promote to root
  items.forEach((item) => {
    const id = String(item._id);
    const current = itemMap.get(id);
    if (item.parentId) {
      const parent = itemMap.get(String(item.parentId));
      if (parent) parent.children.push(current);
      else roots.push(current); // orphan — parent was deleted
    } else {
      roots.push(current);
    }
  });

  return roots;
};

/* -------------------- AUTH -------------------- */

/**
 * POST /api/auth/register
 * Creates a new user account.
 * Validates Adobe-domain email, name lengths, and password minimum.
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

    // Adobe-domain check — mirrors auth-form.js emailValidator
    const ADOBE_DOMAINS = ['adobe.com', 'adobetest.com', 'adobeforums.com', 'adobecorp.com'];
    const domain = email.trim().toLowerCase().split('@')[1] || '';
    const isAdobe = ADOBE_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
    if (!isAdobe)
      return res.status(400).json({ error: 'Only Adobe corporate email addresses are allowed.' });

    // Guard against duplicate accounts
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing)
      return res.status(409).json({ error: 'An account with this email already exists.' });

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    // Return the user without the password hash
    const { password: _pw, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user.toObject();
    return res.status(201).json({ success: true, user: safeUser });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
});

/**
 * POST /api/auth/login
 * Validates credentials and returns the user object on success.
 * Intentionally vague error messages to prevent user enumeration.
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

    const { password: _pw, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user.toObject();
    return res.json({ success: true, user: safeUser });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sign-in failed.' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Generates a reset token and stores it on the user document.
 * In production, send the token via email — here it is returned in the
 * response so you can wire it to your email provider (e.g. SendGrid).
 *
 * Token expires in 30 minutes, matching the UI message.
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim())
      return res.status(400).json({ error: 'Email address is required.' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Always respond with success to prevent user enumeration
    if (!user)
      return res.json({ success: true });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save();

    // Send reset link via Gmail
    const resetLink = `${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/reset-password?token=${token}`;
    // Create transporter here so it always reads the latest env values
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
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
          <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#1473e6;color:#fff;text-decoration:none;border-radius:4px;margin:16px 0">
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


/* -------------------- AUTH — RESET PASSWORD -------------------- */

/**
 * POST /api/auth/reset-password
 * Verifies the reset token and updates the user's password.
 * Token must exist and not be expired (30-minute window).
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
      resetTokenExpiry: { $gt: new Date() }, // token must not be expired
    });

    if (!user)
      return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });

    // Update password and clear the token
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
 * Creates a new post.
 * Validates that title is at least 15 chars, body plain-text is at least 20 chars,
 * category is present, and tags is a non-empty array.
 */
app.post('/api/posts', async (req, res) => {
  try {
    const { title, category, body, tags } = req.body;

    if (!title || !title.trim())
      return res.status(400).json({ error: 'Title is required' });

    if (title.length > 150)
      return res.status(400).json({ error: 'Title too long' });

    if (!category || !Array.isArray(tags) || !tags.length)
      return res.status(400).json({ error: 'Invalid payload' });

    // Strip HTML tags before checking minimum body length
    const plainText = String(body).replace(/<[^>]*>/g, '').trim();
    if (plainText.length < 20)
      return res.status(400).json({ error: 'Body too short' });

    const post = await Post.create({ title, category, body, tags });

    res.status(201).json({ success: true, post });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Post creation failed' });
  }
});

/* -------------------- POSTS (PAGINATION) -------------------- */

/**
 * GET /api/posts?page=1&limit=12&search=
 * Returns a paginated list of posts.
 * Optional `search` param matches against title, category, or tags.
 */
app.get('/api/posts', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 12);
    const search = req.query.search?.trim();

    const query = search ? {
      $or: [
        { title: new RegExp(escapeRegex(search), 'i') },
        { category: new RegExp(escapeRegex(search), 'i') },
        { tags: search },
      ]
    } : {};

    const [posts, total] = await Promise.all([
      Post.find(query)
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
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * GET /api/posts/:id
 * Returns a single post by its MongoDB ObjectId.
 */
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ success: true, post });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch post' });
  }
});

/* -------------------- SIDEBAR — ITEMS -------------------- */

/**
 * POST /api/sidebar-items
 * Creates a sidebar item (post link or sub-folder) inside an existing category.
 *
 * Expected body:
 *   { title, category, postId?, parentId?, isFolder }
 *
 * NOTE: Do NOT use this endpoint to create a top-level / root folder.
 *       Use POST /api/sidebar/categories for that instead. Sending a root
 *       folder here would result in it appearing both as the category header
 *       AND as a duplicate child item inside that category.
 *
 * `order` is derived automatically from how many siblings already exist
 * so new items always appear at the end of their parent's children list.
 */
app.post('/api/sidebar-items', async (req, res) => {
  try {
    const { title, category, postId, parentId = null, isFolder } = req.body;

    if (!title || !category)
      return res.status(400).json({ error: 'Invalid payload' });

    // Guard against duplicate folder names within the same parent
    if (isFolder) {
      const duplicate = await SidebarItem.findOne({ title, category, parentId, isFolder: true });
      if (duplicate) return res.status(409).json({ error: 'A folder with that name already exists here.' });
    }

    // Count existing siblings to determine insertion order
    const order = await SidebarItem.countDocuments({ parentId, category });

    const item = await SidebarItem.create({
      title,
      category,
      parentId,
      postId: isFolder ? null : postId, // folders never reference a post
      isFolder: Boolean(isFolder),
      order,
    });

    res.status(201).json({ success: true, item });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sidebar item creation failed' });
  }
});


/* -------------------- SIDEBAR — SMART ADD -------------------- */

/**
 * POST /api/sidebar-items/smart-add
 * Called after a post is created. Ensures the category anchor exists,
 * then creates a leaf SidebarItem linking the post into the sidebar.
 */
app.post('/api/sidebar-items/smart-add', async (req, res) => {
  try {
    const { title, category, postId } = req.body;

    if (!title || !category || !postId)
      return res.status(400).json({ error: 'Invalid payload' });

    const categoryName = category.trim();

    // Ensure the root category anchor exists
    const anchorExists = await SidebarItem.findOne({
      category: categoryName,
      parentId: null,
      isFolder: true,
      title: categoryName,
    });

    if (!anchorExists) {
      const anchorOrder = await SidebarItem.countDocuments({ parentId: null });
      await SidebarItem.create({
        title: categoryName,
        category: categoryName,
        parentId: null,
        postId: null,
        isFolder: true,
        order: anchorOrder,
      });
    }

    // Avoid duplicate post links
    const existing = await SidebarItem.findOne({
      postId: new mongoose.Types.ObjectId(postId),
      category: categoryName,
    });
    if (existing) {
      return res.status(200).json({ success: true, item: existing, duplicate: true });
    }

    // Create the leaf item at root level of category
    const order = await SidebarItem.countDocuments({ parentId: null, category: categoryName });
    const item = await SidebarItem.create({
      title: title.trim(),
      category: categoryName,
      parentId: null,
      postId: new mongoose.Types.ObjectId(postId),
      isFolder: false,
      order,
    });

    return res.status(201).json({ success: true, item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Smart-add failed' });
  }
});

/* -------------------- SIDEBAR — CATEGORIES -------------------- */

/**
 * POST /api/sidebar/categories
 * Creates a new root-level category (top-level folder).
 *
 * Categories are not stored as a separate collection — they are represented
 * by a "category anchor" SidebarItem where title === category and parentId is null.
 * The GET /api/sidebar/categories endpoint detects this anchor and strips it
 * from the children list, so it renders only as the category header in the UI.
 *
 * Returns 409 if a category with the same name already exists.
 */
app.post('/api/sidebar/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ error: 'Category name is required' });

    const categoryName = name.trim();

    // Guard against duplicate root categories
    const existing = await SidebarItem.findOne({
      category: categoryName,
      parentId: null,
      isFolder: true,
      title: categoryName,
    });

    if (existing) {
      return res.status(409).json({ error: 'Category already exists' });
    }

    // The anchor item: title === category signals to the GET handler that
    // this item IS the category root, not a child folder inside it
    const order = await SidebarItem.countDocuments({ parentId: null, category: categoryName });
    const item = await SidebarItem.create({
      title: categoryName,
      category: categoryName,
      parentId: null,
      postId: null,
      isFolder: true,
      order,
    });

    res.status(201).json({ success: true, item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Category creation failed' });
  }
});

/**
 * GET /api/sidebar/categories
 * Returns all categories, each with a fully nested tree of their children.
 *
 * How duplicate-free rendering works:
 *   Each category has an "anchor" SidebarItem (title === category, parentId null).
 *   This handler detects the anchor and excludes it from the items list that gets
 *   passed to buildTree — so the category name appears only as the header, never
 *   also as a child folder inside itself.
 *
 *   The anchor's _id is used as the category's `id` so that the delete endpoint
 *   can target it by ObjectId.
 */
app.get('/api/sidebar/categories', async (_req, res) => {
  try {
    const items = await SidebarItem.find()
      .populate('postId', '_id title category tags body')
      .sort({ category: 1, order: 1, createdAt: 1 });

    // Group all items by their category string
    const groups = new Map();
    items.forEach((item) => {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category).push(item);
    });

    const categories = [];
    groups.forEach((categoryItems, categoryName) => {
      // Find the anchor item for this category (title === category name, no parent)
      const rootAnchor = categoryItems.find(
        (i) => i.isFolder && i.parentId === null && i.title === categoryName,
      );

      // Exclude the anchor from the children tree to prevent the duplicate
      const children = rootAnchor
        ? categoryItems.filter((i) => String(i._id) !== String(rootAnchor._id))
        : categoryItems;

      categories.push({
        // Use the anchor's real ObjectId so delete can find it; fall back to a
        // slug for legacy categories that predate the anchor pattern
        id: rootAnchor
          ? String(rootAnchor._id)
          : categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: categoryName,
        icon: '',
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
 * Deletes an entire category and every item it contains.
 *
 * `:id` must be the ObjectId of the category's anchor SidebarItem
 * (returned as `id` by GET /api/sidebar/categories).
 * All SidebarItems sharing the same `category` string are removed.
 */
app.delete('/api/sidebar/categories/:id', async (req, res) => {
  try {
    const root = await SidebarItem.findById(req.params.id);
    if (!root) return res.status(404).json({ error: 'Category not found' });

    // Wipe the anchor and every item belonging to this category
    await SidebarItem.deleteMany({ category: root.category });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

/* -------------------- SIDEBAR — RENAME -------------------- */

/**
 * PATCH /api/sidebar-items/:id
 * Renames a sidebar item (folder or post link) by updating its title.
 * The category field is intentionally not changed here — renaming a root
 * category would require a separate migration of all items in that category.
 */
app.patch('/api/sidebar-items/:id', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim())
      return res.status(400).json({ error: 'Title is required' });

    const item = await SidebarItem.findByIdAndUpdate(
      req.params.id,
      { title: title.trim(), updatedAt: Date.now() },
      { new: true },
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    return res.json({ success: true, item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Rename failed' });
  }
});

/* -------------------- SIDEBAR — SAFE DELETE -------------------- */

/**
 * DELETE /api/sidebar-items/:id
 * Deletes a single sidebar item and all of its descendants recursively.
 *
 * Uses MongoDB's $graphLookup to collect the full subtree in one query,
 * then removes every collected _id in a single deleteMany call.
 * This ensures no orphaned children are left behind.
 */
app.delete('/api/sidebar-items/:id', async (req, res) => {
  try {
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
          ids: { $concatArrays: [['$_id'], '$descendants._id'] },
          // Collect all postIds from root + descendants (filter out nulls)
          postIds: {
            $filter: {
              input: { $concatArrays: [
                [{ $ifNull: ['$postId', null] }],
                '$descendants.postId',
              ]},
              as: 'pid',
              cond: { $ne: ['$$pid', null] },
            },
          },
        },
      },
    ]);

    if (!result.length) return res.status(404).json({ error: 'Item not found' });

    const { ids, postIds } = result[0];

    // Delete all sidebar items in the subtree
    await SidebarItem.deleteMany({ _id: { $in: ids } });

    // Delete all linked posts
    if (postIds && postIds.length > 0) {
      await Post.deleteMany({ _id: { $in: postIds } });
    }

    res.json({ success: true, deletedPosts: postIds?.length || 0 });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

/* -------------------- SERVER -------------------- */

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
