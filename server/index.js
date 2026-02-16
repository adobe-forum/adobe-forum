import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Post from './models/Post.js';

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
  const origin = req.headers.origin;
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
