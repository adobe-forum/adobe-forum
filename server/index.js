import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Post from './models/Post.js';
import SidebarItem from './models/SidebarItem.js';

/* eslint-disable no-console */

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'null'],
  credentials: true,
}));
// Also allow file:// origins (shows as 'null' string)
app.use((req, res, next) => {
  const { origin } = req.headers;
  if (origin === 'null' || !origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  next();
});
app.use(express.json());

// MongoDB Connection
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

// API Routes

// Create a new post
app.post('/api/posts', async (req, res) => {
  res.type('application/json');
  try {
    const {
      title, category, body, tags,
    } = req.body;

    // Validation
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

    // Normalize body: if client sent a VDOM-like object, serialize to HTML
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
          // Special handling for <img src>
          if (tag === 'img' && k === 'src') {
            // Accept data URIs and http(s) URLs, warn for others
            if (typeof val === 'string' && !val.startsWith('data:') && !/^https?:\/\//.test(val)) {
              console.warn('Image src is not a data URI or http(s) URL:', val);
              // Optionally, you could reject or sanitize here
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

    // If tags were accidentally embedded in body, strip them from the HTML text
    if (tags && Array.isArray(tags) && tags.length > 0) {
      tags.forEach((t) => {
        if (!t) return;
        const esc = String(t).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const re = new RegExp(`\\b${esc}\\b`, 'g');
        bodyHtml = bodyHtml.replace(re, '');
      });
    }

    // Remove HTML tags and trim whitespace to check actual content length
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

    // Create new post
    const newPost = new Post({
      title,
      category,
      body: bodyHtml,
      tags,
    });

    // Save to database
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

// Get all posts (optional - for testing)
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json({ success: true, posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get a single post by ID
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// ============================================
// SIDEBAR ITEMS API ENDPOINTS
// ============================================

// ES6 features for auto-nesting detection
const ES6_FEATURES = [
  'arrow functions', 'arrow function',
  'let', 'const',
  'template literals', 'template strings',
  'destructuring',
  'spread operator', 'rest operator',
  'default parameters',
  'promises', 'promise',
  'async/await', 'async', 'await',
  'classes', 'class',
  'modules', 'import', 'export',
  'map', 'set', 'weakmap', 'weakset',
  'symbol', 'symbols',
  'iterators', 'generators',
  'for...of', 'for of',
  'object.assign', 'object.entries', 'object.values',
  'array.from', 'array.find', 'array.includes',
];

// Helper to detect if content is related to ES6
const detectES6Related = (title, body, tags) => {
  const combined = `${title} ${body || ''} ${(tags || []).join(' ')}`.toLowerCase();
  return ES6_FEATURES.some((feature) => combined.includes(feature.toLowerCase()));
};

// Helper to create nested folder structure from path
const createNestedStructure = async (pathString, postId, category, title, icon) => {
  if (!pathString || !pathString.trim()) {
    // No path provided, create flat item
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

  // Create/find folder items for each part except the last
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;
    currentPath = currentPath ? `${currentPath} > ${part}` : part;

    if (isLastPart) {
      // Last part is the actual content item
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

    // Check if folder already exists
    let folder = await SidebarItem.findOne({
      category,
      title: part,
      isFolder: true,
      parentId,
    });

    if (!folder) {
      // Create new folder
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

// Build tree structure from flat items with auto-clustering by similar names
const buildTree = (items) => {
  const itemMap = new Map();
  const rootItems = [];

  // First pass: create map of all items
  items.forEach((item) => {
    const itemObj = item.toObject ? item.toObject() : item;
    itemObj.children = [];
    itemMap.set(itemObj._id.toString(), itemObj);
  });

  // Second pass: build tree for items with explicit parentId
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

// Extract significant keywords from title for clustering
const extractKeywords = (title) => {
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'it', 'as', 'be', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'getting', 'started', 'introduction', 'basics', 'guide', 'tutorial', 'essentials', 'masterclass', '101', 'advanced', 'beginner'];
  
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.includes(word));
};

// Find common prefix/keyword among items for clustering
const findClusterKeyword = (items) => {
  if (items.length < 2) return null;
  
  const keywordCounts = {};
  
  items.forEach((item) => {
    const keywords = extractKeywords(item.title);
    keywords.forEach((keyword) => {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    });
  });
  
  // Find keywords that appear in multiple items (threshold: 2+)
  const commonKeywords = Object.entries(keywordCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);
  
  return commonKeywords.length > 0 ? commonKeywords[0][0] : null;
};

// Build auto-clustered tree structure
const buildAutoClusteredTree = (items) => {
  // Group items by category first
  const categoryGroups = {};
  
  items.forEach((item) => {
    const itemObj = item.toObject ? item.toObject() : item;
    itemObj.children = [];
    
    // Skip folders, only process content items
    if (itemObj.isFolder) return;
    
    const cat = itemObj.category;
    if (!categoryGroups[cat]) {
      categoryGroups[cat] = [];
    }
    categoryGroups[cat].push(itemObj);
  });
  
  const result = [];
  
  // For each category, cluster items with similar names
  Object.entries(categoryGroups).forEach(([, categoryItems]) => {
    // Group by first significant keyword in title
    const clusters = {};
    const standalone = [];
    
    categoryItems.forEach((item) => {
      const keywords = extractKeywords(item.title);
      const primaryKeyword = keywords[0]; // First keyword
      
      if (primaryKeyword) {
        if (!clusters[primaryKeyword]) {
          clusters[primaryKeyword] = [];
        }
        clusters[primaryKeyword].push(item);
      } else {
        standalone.push(item);
      }
    });
    
    // Process clusters
    Object.entries(clusters).forEach(([keyword, clusterItems]) => {
      if (clusterItems.length >= 2) {
        // Create a virtual folder for this cluster
        const folder = {
          _id: `cluster-${keyword}-${Date.now()}`,
          title: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          category: clusterItems[0].category,
          icon: '📁',
          isFolder: true,
          isVirtualFolder: true, // Mark as auto-generated
          children: clusterItems,
          postId: null,
        };
        result.push(folder);
      } else {
        // Single item, add as standalone
        standalone.push(...clusterItems);
      }
    });
    
    // Add standalone items
    result.push(...standalone);
  });
  
  return result;
};

// Get all sidebar items (returns auto-clustered tree structure)
app.get('/api/sidebar-items', async (req, res) => {
  try {
    const items = await SidebarItem.find()
      .populate('postId')
      .sort({ category: 1, order: 1, createdAt: 1 });
    
    // Use auto-clustering for better UI
    const clusteredTree = buildAutoClusteredTree(items);
    const regularTree = buildTree(items);
    
    res.json({ 
      success: true, 
      items: clusteredTree, 
      flatItems: items,
      regularTree, // Also provide non-clustered tree
    });
  } catch (error) {
    console.error('Error fetching sidebar items:', error);
    res.status(500).json({ error: 'Failed to fetch sidebar items' });
  }
});

// Get sidebar items by category
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

// Get a single sidebar item by ID
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

// Create a new sidebar item with nested structure support
app.post('/api/sidebar-items', async (req, res) => {
  try {
    const {
      title, category, icon, postId, order, path, autoNestES6,
    } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    if (!postId) {
      return res.status(400).json({ error: 'Post ID is required' });
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if this is ES6 related content and should be auto-nested
    let finalPath = path || '';
    if (autoNestES6 !== false) {
      const isES6Related = detectES6Related(title, post.body, post.tags);
      if (isES6Related && !finalPath.toLowerCase().includes('es6')) {
        // Auto-nest under ES6 category
        finalPath = finalPath ? `ES6 Features > ${finalPath}` : `ES6 Features > ${title}`;
      }
    }

    // ── Duplicate check: prevent creating the same folder twice ──────────
    if (isFolder) {
      const { parentId = null } = req.body;
      const existing = await SidebarItem.findOne({
        title: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        category,
        parentId: parentId || null,
        isFolder: true,
      });
      if (existing) {
        const populatedExisting = await SidebarItem.findById(existing._id).populate('postId', '_id title body');
        return res.status(200).json({
          success: true,
          message: 'Folder already exists',
          item: populatedExisting,
        });
      }
    }
    // ────────────────────────────────────────────────────────────────────

    const { parentId = null } = req.body;

    let savedItem;
    if (isFolder) {
      // Create folder directly with parentId — bypass createNestedStructure
      // which doesn't support parentId
      const newFolder = new SidebarItem({
        title,
        category,
        icon: '📁',
        postId: null,
        isFolder: true,
        parentId: parentId || null,
        path: path || '',
      });
      savedItem = await newFolder.save();
    } else {
      savedItem = await createNestedStructure(
        path || '',
        postId || null,
        category,
        title,
        icon || '📄',
      );
    }

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

// Update a sidebar item
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

// Delete a sidebar item
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

// Get post by sidebar item
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

// ============================================
// DELETE: Remove an entire category and all its items
// ============================================
app.delete('/api/sidebar/categories/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;

    // categoryId is the slug (e.g. "api-test"), find matching items by category name
    // We need to find all items where category slug matches
    const allItems = await SidebarItem.find();
    const matchingItems = allItems.filter((item) => {
      const slug = item.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return slug === categoryId;
    });

    if (matchingItems.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    // Recursively delete all items in this category
    for (const item of matchingItems) {
      // eslint-disable-next-line no-await-in-loop
      await SidebarItem.findByIdAndDelete(item._id);
    }

    return res.json({
      success: true,
      message: `Category deleted with ${matchingItems.length} items`,
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================
// DELETE: Remove an entire category and all its items
// ============================================
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
