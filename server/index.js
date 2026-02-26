import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
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

const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

/* -------------------- POSTS -------------------- */

app.post('/api/posts', async (req, res) => {
  try {
    const { title, category, body, tags } = req.body;

    if (!title || title.length < 15)
      return res.status(400).json({ error: 'Title too short' });

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
    });

    res.status(201).json({ success: true, post });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Post creation failed' });
  }
});

/* -------------------- POSTS (PAGINATION) -------------------- */

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

/* -------------------- SIDEBAR (ADJACENCY LIST ONLY) -------------------- */

app.post('/api/sidebar-items', async (req, res) => {
  try {
    const { title, category, postId, parentId = null, isFolder } = req.body;

    if (!title || !category)
      return res.status(400).json({ error: 'Invalid payload' });

    const order = await SidebarItem.countDocuments({ parentId, category });

    const item = await SidebarItem.create({
      title,
      category,
      parentId,
      postId: isFolder ? null : postId,
      isFolder: Boolean(isFolder),
      order,
    });

    res.status(201).json({ success: true, item });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sidebar item creation failed' });
  }
});

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
      categories.push({
        id: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: categoryName,
        icon: '',
        items: buildTree(categoryItems),
      });
    });

    categories.sort((a, b) => a.name.localeCompare(b.name));
    return res.json({ success: true, categories, totalItems: items.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

/* -------------------- SAFE DELETE -------------------- */

app.delete('/api/sidebar-items/:id', async (req, res) => {
  try {
    const ids = await SidebarItem.aggregate([
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
          ids: {
            $concatArrays: [['$_id'], '$descendants._id'],
          },
        },
      },
    ]);

    await SidebarItem.deleteMany({ _id: { $in: ids[0].ids } });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

/* -------------------- SERVER -------------------- */

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
