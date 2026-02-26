import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Post from './models/Post.js';
import SidebarItem from './models/SidebarItem.js';

/* eslint-disable no-console */
// Load .env from parent directory (project root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

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
app.use(express.json({ limit: '10mb' }));

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
      return res.status(400).json({ error: 'Title must be at least 15 characters' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
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
      return res.status(400).json({ error: `Body must be at least 20 characters. Current length: ${bodyText.length}` });
    }

    if (!tags || tags.length === 0) {
      return res.status(400).json({ error: 'At least one tag is required' });
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
    return res.status(500).json({ error: 'Failed to create post', details: error.message });
  }
});

// ============================================
// Server-side pagination & searching (Posts)
// ============================================
app.get('/api/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = req.query.search || '';

    let query = {};
    
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { body: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const skipIndex = (page - 1) * limit;

    const [posts, totalPosts] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skipIndex)
        // 👇 Here is the fix: telling Mongoose not to crash if 'author' is missing
        .populate({ path: 'author', select: 'name username', strictPopulate: false }), 
      
      Post.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      success: true,
      posts,
      totalPages,
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ success: true, post });
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).json({ error: 'Failed to fetch post' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const createNestedStructure = async (pathString, postId, category, title) => {
  if (!pathString || !pathString.trim()) {
    const newItem = new SidebarItem({
      title,
      category,
      icon: '',
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
      icon: '',
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
        icon: '',
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
        icon: '',
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
      .populate('postId', '_id title') // OPTIMIZED
      .sort({ category: 1, order: 1, createdAt: 1 });

    const tree = buildTree(items);

    res.json({ success: true, items: tree, flatItems: items });
  } catch (error) {
    console.error('Error fetching sidebar items:', error);
    res.status(500).json({ error: 'Failed to fetch sidebar items' });
  }
});

// ============================================
// UPDATED: Server-side pagination for Categories
// ============================================
app.get('/api/sidebar-items/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skipIndex = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      SidebarItem.find({ category })
        .populate('postId', '_id title body')
        .sort({ order: 1 })
        .skip(skipIndex)
        .limit(limit),
      SidebarItem.countDocuments({ category })
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    res.json({ 
      success: true, 
      items, 
      totalPages,
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching sidebar items by category:', error);
    res.status(500).json({ error: 'Failed to fetch sidebar items' });
  }
});

app.get('/api/sidebar-items/:id', async (req, res) => {
  try {
    const item = await SidebarItem.findById(req.params.id).populate('postId'); // Detail view usually needs full object, left intact
    if (!item) return res.status(404).json({ error: 'Sidebar item not found' });
    return res.json({ success: true, item });
  } catch (error) {
    console.error('Error fetching sidebar item:', error);
    return res.status(500).json({ error: 'Failed to fetch sidebar item' });
  }
});

app.post('/api/sidebar-items', async (req, res) => {
  try {
    const {
      title, category, postId, path, isFolder,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!category) return res.status(400).json({ error: 'Category is required' });

    if (!isFolder && postId) {
      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ error: 'Post not found' });
    }

    if (isFolder) {
      const { parentId = null } = req.body;
      const existing = await SidebarItem.findOne({
        title: { $regex: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        category,
        parentId: parentId || null,
        isFolder: true,
      });
      if (existing) {
        const populatedExisting = await SidebarItem.findById(existing._id).populate('postId', '_id title'); // OPTIMIZED
        return res.status(200).json({ success: true, message: 'Folder already exists', item: populatedExisting });
      }
    }

    const { parentId = null } = req.body;

    let savedItem;
    if (isFolder) {
      const newFolder = new SidebarItem({
        title,
        category,
        icon: '',
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
        title
      );
    }

    const populatedItem = await SidebarItem.findById(savedItem._id).populate('postId', '_id title'); // OPTIMIZED

    return res.status(201).json({ success: true, message: 'Sidebar item created successfully', item: populatedItem });
  } catch (error) {
    console.error('Error creating sidebar item:', error);
    return res.status(500).json({ error: 'Failed to create sidebar item', details: error.message });
  }
});

app.post('/api/sidebar-items/smart-add', async (req, res) => {
  try {
    const {
      title, category, postId, parentId = null,
    } = req.body;

    if (!title || !category) return res.status(400).json({ success: false, error: 'Title and category are required' });

    const normalizedCategory = category.trim();
    const normalizedTitle = title.trim();

    let postIdObjectId = null;
    if (postId) {
      try { postIdObjectId = new mongoose.Types.ObjectId(postId); } 
      catch (err) { return res.status(400).json({ success: false, error: `Invalid postId format: ${postId}` }); }
    }

    const existingItem = await SidebarItem.findOne({
      title: { $regex: new RegExp(`^${normalizedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      category: { $regex: new RegExp(`^${normalizedCategory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      parentId: parentId || null,
    });

    if (existingItem) {
      if (existingItem.isFolder) {
        const childCount = await SidebarItem.countDocuments({ parentId: existingItem._id });
        const newItem = new SidebarItem({
          title: normalizedTitle,
          category: existingItem.category,
          parentId: existingItem._id,
          postId: postIdObjectId,
          icon: '',
          isFolder: false,
          order: childCount,
        });
        await newItem.save();
        await newItem.populate('postId', '_id title'); // OPTIMIZED
        return res.status(201).json({ success: true, action: 'added_to_existing_folder', item: newItem.toObject(), parent: existingItem.toObject() });
      }

      const originalPostId = existingItem.postId;
      existingItem.isFolder = true;
      existingItem.icon = '';
      existingItem.postId = null;
      await existingItem.save();

      const originalChild = new SidebarItem({
        title: `${normalizedTitle} (1)`,
        category: existingItem.category,
        parentId: existingItem._id,
        postId: originalPostId,
        icon: '',
        isFolder: false,
        order: 0,
      });
      await originalChild.save();

      const newChild = new SidebarItem({
        title: `${normalizedTitle} (2)`,
        category: existingItem.category,
        parentId: existingItem._id,
        postId: postIdObjectId,
        icon: '',
        isFolder: false,
        order: 1,
      });
      await newChild.save();
      await newChild.populate('postId', '_id title'); // OPTIMIZED

      const children = await SidebarItem.find({ parentId: existingItem._id })
        .populate('postId', '_id title body')
        .sort({ order: 1 });

      return res.status(200).json({
        success: true,
        action: 'transformed_to_folder',
        parent: { ...existingItem.toObject(), children },
        newItem: newChild,
      });
    }

    const itemCount = await SidebarItem.countDocuments({
      category: { $regex: new RegExp(`^${normalizedCategory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      parentId: parentId || null,
    });

    const newItem = new SidebarItem({
      title: normalizedTitle,
      category: normalizedCategory,
      parentId: parentId || null,
      postId: postIdObjectId,
      icon: '',
      isFolder: false,
      order: itemCount,
    });

    await newItem.save();
    await newItem.populate('postId', '_id title'); // OPTIMIZED
    return res.status(201).json({ success: true, action: 'created_new', item: newItem.toObject() });
  } catch (error) {
    console.error('Error in smart-add:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/sidebar/categories', async (req, res) => {
  try {
    const items = await SidebarItem.find()
      .populate('postId', '_id title category tags') // OPTIMIZED
      .sort({ category: 1, order: 1, createdAt: 1 });

    const categoryMap = new Map();

    items.forEach((item) => {
      const catName = item.category;
      if (!categoryMap.has(catName)) categoryMap.set(catName, []);
      if (!item.postId && !item.isFolder) console.warn(`Warning: Item "${item.title}" has no postId`);
      categoryMap.get(catName).push(item);
    });

    const categories = [];
    categoryMap.forEach((categoryItems, categoryName) => {
      const tree = buildTree(categoryItems);
      categories.push({
        id: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: categoryName,
        icon: '',
        items: tree,
      });
    });

    categories.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ success: true, categories, totalItems: items.length });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// NEW ENDPOINT: Safely rename all matching categories
app.put('/api/sidebar/categories/rename/:exactOldName', async (req, res) => {
  try {
    const { exactOldName } = req.params;
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: 'New name is required' });

    await SidebarItem.updateMany(
      { category: exactOldName },
      { $set: { category: newName } }
    );
    res.json({ success: true, message: 'Category renamed successfully' });
  } catch (error) {
    console.error('Error renaming category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/sidebar-items/:id', async (req, res) => {
  try {
    const {
      title, category, icon, postId, order, parentId,
    } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (category) updateData.category = category;
    if (icon !== undefined) updateData.icon = icon;
    if (postId) updateData.postId = postId;
    if (order !== undefined) updateData.order = order;
    if (parentId !== undefined) updateData.parentId = parentId;

    const updatedItem = await SidebarItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    ).populate('postId', '_id title'); // OPTIMIZED

    if (!updatedItem) return res.status(404).json({ error: 'Sidebar item not found' });
    return res.json({ success: true, message: 'Sidebar item updated successfully', item: updatedItem });
  } catch (error) {
    console.error('Error updating sidebar item:', error);
    return res.status(500).json({ error: 'Failed to update sidebar item', details: error.message });
  }
});

const recursivelyDeleteSidebarItem = async (itemId) => {
  const item = await SidebarItem.findById(itemId);
  if (!item) return;

  if (item.isFolder) {
    const children = await SidebarItem.find({ parentId: itemId });
    for (const child of children) {
      await recursivelyDeleteSidebarItem(child._id);
    }
  }

  await SidebarItem.findByIdAndDelete(itemId);
};

app.delete('/api/sidebar-items/:id', async (req, res) => {
  try {
    const itemToDelete = await SidebarItem.findById(req.params.id);
    if (!itemToDelete) {
      return res.status(404).json({ error: 'Sidebar item not found' });
    }

    await recursivelyDeleteSidebarItem(req.params.id);
    return res.json({ success: true, message: 'Sidebar item and all children deleted successfully' });
  } catch (error) {
    console.error('Error deleting sidebar item:', error);
    return res.status(500).json({ error: 'Failed to delete sidebar item', details: error.message });
  }
});

app.get('/api/sidebar-items/:id/post', async (req, res) => {
  try {
    const item = await SidebarItem.findById(req.params.id).populate('postId');
    if (!item) return res.status(404).json({ error: 'Sidebar item not found' });
    if (!item.postId) return res.status(404).json({ error: 'Associated post not found' });
    return res.json({ success: true, post: item.postId });
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).json({ error: 'Failed to fetch post' });
  }
});

app.delete('/api/sidebar/categories/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const allItems = await SidebarItem.find();
    const matchingItems = allItems.filter((item) => {
      const slug = item.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return slug === categoryId;
    });

    if (matchingItems.length === 0) return res.status(404).json({ success: false, error: 'Category not found' });

    for (const item of matchingItems) {
      if (item.postId) await Post.findByIdAndDelete(item.postId);
      // eslint-disable-next-line no-await-in-loop
      await SidebarItem.findByIdAndDelete(item._id);
    }
    return res.json({ success: true, message: `Category and all associated posts deleted (${matchingItems.length} items)` });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});