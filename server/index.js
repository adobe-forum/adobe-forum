import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from './models/user.js';
import authMiddleware from './middleware/authMiddleware.js';
import Post from './models/Post.js';
import SidebarItem from './models/SidebarItem.js';

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

/* -------------------- AUTHENTICATION ROUTES -------------------- */

// Helper function to generate JWT tokens
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // Token lasts for 30 days
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await User.create({ username, email, password });

    if (user) {
      res.status(201).json({
        _id: user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ error: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate a user & get token
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/me
// @desc    Get current logged-in user details (Protected Route Example)
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      _id: req.user.id,
      username: req.user.username,
      email: req.user.email,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/* -------------------- POSTS -------------------- */

/**
 * POST /api/posts
 * Creates a new post.
 * Validates that title is at least 15 chars, body plain-text is at least 20 chars,
 * category is present, and tags is a non-empty array.
 */
app.post('/api/posts', authMiddleware, async (req, res) => {
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

    const post = await Post.create({ 
      title, 
      category, 
      body, 
      tags,
      createdBy: req.user._id // Assign ownership
    });

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
    // NEW: populate createdBy so frontend gets the author's username
    const post = await Post.findById(req.params.id).populate('createdBy', 'username');
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
 */
app.post('/api/sidebar-items', authMiddleware, async (req, res) => {
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
      createdBy: req.user._id // Assign ownership
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
app.post('/api/sidebar-items/smart-add', authMiddleware, async (req, res) => {
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
        createdBy: req.user._id // Assign ownership
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
      createdBy: req.user._id // Assign ownership
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
 */
app.post('/api/sidebar/categories', authMiddleware, async (req, res) => {
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
      createdBy: req.user._id // Assign ownership
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
        // NEW: expose createdById so the frontend can compare against logged-in user
        createdById: rootAnchor ? String(rootAnchor.createdBy) : null,
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
 */
app.delete('/api/sidebar/categories/:id', authMiddleware, async (req, res) => {
  try {
    const root = await SidebarItem.findById(req.params.id);
    if (!root) return res.status(404).json({ error: 'Category not found' });

    // Verify ownership: Only the creator can delete it
    if (root.createdBy && root.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this category' });
    }

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
 */
app.patch('/api/sidebar-items/:id', authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim())
      return res.status(400).json({ error: 'Title is required' });

    // Ownership check — only the creator can rename
    const existing = await SidebarItem.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Item not found' });
    if (existing.createdBy && existing.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized to edit this item' });

    const item = await SidebarItem.findByIdAndUpdate(
      req.params.id,
      { title: title.trim(), updatedAt: Date.now() },
      { new: true },
    );
    return res.json({ success: true, item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Rename failed' });
  }
});

/**
 * PATCH /api/posts/:id
 * Updates a post's title, body, tags, category.
 * Only the original author can edit their post.
 */
app.patch('/api/posts/:id', authMiddleware, async (req, res) => {
  try {
    const { title, body, tags, category } = req.body;

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Ownership check — only the creator can edit
    if (post.createdBy && post.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not authorized to edit this post' });

    // Validate what's being updated
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

    post.updatedAt = Date.now();
    await post.save();

    return res.json({ success: true, post });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Post update failed' });
  }
});

/* -------------------- SIDEBAR — SAFE DELETE -------------------- */

/**
 * DELETE /api/sidebar-items/:id
 * Deletes a single sidebar item and all of its descendants recursively.
 */
app.delete('/api/sidebar-items/:id', authMiddleware, async (req, res) => {
  try {
    // Verify ownership before looking up the tree
    const targetItem = await SidebarItem.findById(req.params.id);
    if (!targetItem) return res.status(404).json({ error: 'Item not found' });

    if (targetItem.createdBy && targetItem.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this item' });
    }

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