import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Post from './models/Post.js';
import SidebarItem from './models/SidebarItem.js';

/* eslint-disable no-console */
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:3000', 'null'],
  credentials: true,
}));
app.use((req, res, next) => {
  const { origin } = req.headers;
  if (origin === 'null' || !origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  next();
});
app.use(express.json());

const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

app.post('/api/posts', async (req, res) => {
  res.type('application/json');
  try {
    const {
      title, category, body, tags,
    } = req.body;

    if (!title || title.length < 15) {
      return res.status(400).json({
        error: 'Title must be at least 15 characters',
      });
    }

    if (!category) {
      return res.status(400).json({
        error: 'Category is required',
      });
    }

    const nodeToHtml = (node) => {
      if (node == null) return '';
      if (typeof node === 'string') return node;
      if (Array.isArray(node)) return node.map(nodeToHtml).join('');
      const { tag, attributes = {}, children = [] } = node;
      const attrs = Object.entries(attributes || {})
        .map(([k, v]) => {
          if (v == null) return '';
          let val = v;
          if (typeof v === 'object') val = v.uri || v.src || JSON.stringify(v);
          if (tag === 'img' && k === 'src') {
            if (typeof val === 'string' && !val.startsWith('data:') && !/^https?:\/\//.test(val)) {
              console.warn('Image src is not a data URI or http(s) URL:', val);
            }
          }
          return `${k}="${String(val).replace(/"/g, '&quot;')}"`;
        })
        .filter(Boolean)
        .join(' ');
      const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
      const selfClose = ['img', 'br', 'hr', 'input', 'meta', 'link'];
      const inner = nodeToHtml(children);
      if (selfClose.includes(tag)) return open;
      return `${open}${inner}</${tag}>`;
    };

    let bodyHtml = '';
    if (body == null) bodyHtml = '';
    else if (typeof body === 'string') bodyHtml = body;
    else bodyHtml = nodeToHtml(body);

    if (tags && Array.isArray(tags) && tags.length > 0) {
      tags.forEach((t) => {
        if (!t) return;
        const esc = String(t).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const re = new RegExp(`\\b${esc}\\b`, 'g');
        bodyHtml = bodyHtml.replace(re, '');
      });
    }

    const bodyText = String(bodyHtml).replace(/<[^>]*>/g, '').trim();
    if (!bodyHtml || bodyText.length < 20) {
      return res.status(400).json({
        error: `Body must be at least 20 characters. Current length: ${bodyText.length}`,
      });
    }

    if (!tags || tags.length === 0) {
      return res.status(400).json({
        error: 'At least one tag is required',
      });
    }

    const newPost = new Post({
      title,
      category,
      body: bodyHtml,
      tags,
    });

    const savedPost = await newPost.save();

    return res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: savedPost,
    });
  } catch (error) {
    console.error('Error creating post:', error.message);
    console.error('Request body:', req.body);
    console.error('Full error:', error);
    return res.status(500).json({
      error: 'Failed to create post',
      details: error.message,
    });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json({ success: true, posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    return res.json({ success: true, post });
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).json({ error: 'Failed to fetch post' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const createNestedStructure = async (pathString, postId, category, title, icon) => {
  if (!pathString || !pathString.trim()) {
    const newItem = new SidebarItem({
      title,
      category,
      icon: icon || '📄',
      postId,
      isFolder: false,
      parentId: null,
      path: '',
    });
    return newItem.save();
  }

  const parts = pathString.split('>').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    const newItem = new SidebarItem({
      title,
      category,
      icon: icon || '📄',
      postId,
      isFolder: false,
      parentId: null,
      path: '',
    });
    return newItem.save();
  }

  let parentId = null;
  let currentPath = '';

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;
    currentPath = currentPath ? `${currentPath} > ${part}` : part;

    if (isLastPart) {
      const contentItem = new SidebarItem({
        title: part,
        category,
        icon: icon || '📄',
        postId,
        isFolder: false,
        parentId,
        path: currentPath,
      });
      return contentItem.save();
    }

    let folder = await SidebarItem.findOne({
      category,
      title: part,
      isFolder: true,
      parentId,
    });

    if (!folder) {
      folder = new SidebarItem({
        title: part,
        category,
        icon: '📁',
        postId: null,
        isFolder: true,
        parentId,
        path: currentPath,
      });
      await folder.save();
    }

    parentId = folder._id;
  }

  return null;
};

const buildTree = (items) => {
  const itemMap = new Map();
  const rootItems = [];

  items.forEach((item) => {
    const itemObj = item.toObject ? item.toObject() : item;
    itemObj.children = [];
    itemMap.set(itemObj._id.toString(), itemObj);
  });

  items.forEach((item) => {
    const itemObj = itemMap.get(item._id.toString());
    if (item.parentId) {
      const parent = itemMap.get(item.parentId.toString());
      if (parent) {
        parent.children.push(itemObj);
      } else {
        rootItems.push(itemObj);
      }
    } else {
      rootItems.push(itemObj);
    }
  });

  return rootItems;
};

app.get('/api/sidebar-items', async (req, res) => {
  try {
    const items = await SidebarItem.find()
      .populate('postId')
      .sort({ category: 1, order: 1, createdAt: 1 });

    const tree = buildTree(items);

    res.json({
      success: true,
      items: tree,
      flatItems: items,
    });
  } catch (error) {
    console.error('Error fetching sidebar items:', error);
    res.status(500).json({ error: 'Failed to fetch sidebar items' });
  }
});

app.get('/api/sidebar-items/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const items = await SidebarItem.find({ category })
      .populate('postId')
      .sort({ order: 1 });
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error fetching sidebar items:', error);
    res.status(500).json({ error: 'Failed to fetch sidebar items' });
  }
});

app.get('/api/sidebar-items/:id', async (req, res) => {
  try {
    const item = await SidebarItem.findById(req.params.id).populate('postId');
    if (!item) {
      return res.status(404).json({ error: 'Sidebar item not found' });
    }
    return res.json({ success: true, item });
  } catch (error) {
    console.error('Error fetching sidebar item:', error);
    return res.status(500).json({ error: 'Failed to fetch sidebar item' });
  }
});

app.post('/api/sidebar-items', async (req, res) => {
  try {
    const {
      title, category, icon, postId, order, path,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    if (!postId) {
      return res.status(400).json({ error: 'Post ID is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const savedItem = await createNestedStructure(
      path || '',
      postId,
      category,
      title,
      icon || '📄',
    );

    const populatedItem = await SidebarItem.findById(savedItem._id).populate('postId');

    return res.status(201).json({
      success: true,
      message: 'Sidebar item created successfully',
      item: populatedItem,
    });
  } catch (error) {
    console.error('Error creating sidebar item:', error);
    return res.status(500).json({
      error: 'Failed to create sidebar item',
      details: error.message,
    });
  }
});

app.put('/api/sidebar-items/:id', async (req, res) => {
  try {
    const {
      title, category, icon, postId, order,
    } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (category) updateData.category = category;
    if (icon) updateData.icon = icon;
    if (postId) updateData.postId = postId;
    if (order !== undefined) updateData.order = order;

    const updatedItem = await SidebarItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    ).populate('postId');

    if (!updatedItem) {
      return res.status(404).json({ error: 'Sidebar item not found' });
    }

    return res.json({
      success: true,
      message: 'Sidebar item updated successfully',
      item: updatedItem,
    });
  } catch (error) {
    console.error('Error updating sidebar item:', error);
    return res.status(500).json({
      error: 'Failed to update sidebar item',
      details: error.message,
    });
  }
});

app.delete('/api/sidebar-items/:id', async (req, res) => {
  try {
    const deletedItem = await SidebarItem.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ error: 'Sidebar item not found' });
    }
    return res.json({
      success: true,
      message: 'Sidebar item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting sidebar item:', error);
    return res.status(500).json({
      error: 'Failed to delete sidebar item',
      details: error.message,
    });
  }
});

app.get('/api/sidebar-items/:id/post', async (req, res) => {
  try {
    const item = await SidebarItem.findById(req.params.id).populate('postId');
    if (!item) {
      return res.status(404).json({ error: 'Sidebar item not found' });
    }
    if (!item.postId) {
      return res.status(404).json({ error: 'Associated post not found' });
    }
    return res.json({ success: true, post: item.postId });
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).json({ error: 'Failed to fetch post' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
