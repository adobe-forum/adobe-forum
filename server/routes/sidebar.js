import { Router } from 'express';
import mongoose from 'mongoose';
import SidebarItem from '../models/SidebarItem.js';
import Post from '../models/Post.js';
import requireAuth from '../middleware/auth.js';
import buildTree from '../helpers/buildTree.js';

const router = Router();

/* ── Shared helper ─────────────────────────────────────────────────────────── */

/**
 * Ensures a category anchor item (a root-level folder whose title matches
 * the category name) exists. Creates one if it doesn't.
 * Returns the existing or newly created anchor.
 */
async function ensureCategoryAnchor(categoryName, userId) {
  const existing = await SidebarItem.findOne({
    category: categoryName,
    parentId: null,
    isFolder: true,
    title: categoryName,
  });
  if (existing) return existing;

  const order = await SidebarItem.countDocuments({ parentId: null });
  return SidebarItem.create({
    title: categoryName,
    category: categoryName,
    parentId: null,
    postId: null,
    isFolder: true,
    order,
    createdBy: userId,
  });
}

/* ── Sidebar Items ─────────────────────────────────────────────────────────── */

/**
 * GET /api/sidebar-items/by-post/:postId
 * Returns the SidebarItem that links to a given post.
 */
router.get('/sidebar-items/by-post/:postId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId))
      return res.status(400).json({ error: 'Invalid postId' });

    const item = await SidebarItem.findOne({
      postId: new mongoose.Types.ObjectId(req.params.postId),
      isFolder: false,
    });
    if (!item) return res.status(404).json({ error: 'No sidebar item found for this post' });

    return res.json({ success: true, sidebarItemId: String(item._id) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Lookup failed' });
  }
});

/**
 * POST /api/sidebar-items
 */
router.post('/sidebar-items', requireAuth, async (req, res) => {
  try {
    const { title, category, postId, parentId = null, isFolder } = req.body;

    if (!title || !category)
      return res.status(400).json({ error: 'Invalid payload' });
    if (title.trim().length > 50)
      return res.status(400).json({ error: 'Name must be 50 characters or fewer.' });

    if (isFolder) {
      const duplicate = await SidebarItem.findOne({ title, category, parentId, isFolder: true });
      if (duplicate)
        return res.status(409).json({ error: 'A folder with that name already exists here.' });
    }

    const order = await SidebarItem.countDocuments({ parentId, category });

    const item = await SidebarItem.create({
      title,
      category,
      parentId,
      postId: isFolder ? null : postId,
      isFolder: Boolean(isFolder),
      order,
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sidebar item creation failed' });
  }
});

/**
 * POST /api/sidebar-items/smart-add
 * Creates the category anchor if needed, then creates the leaf item.
 */
router.post('/sidebar-items/smart-add', requireAuth, async (req, res) => {
  try {
    const { title, category, postId, parentId = null } = req.body;

    if (!title || !category || !postId)
      return res.status(400).json({ error: 'Invalid payload' });
    if (title.trim().length > 50)
      return res.status(400).json({ error: 'Name must be 50 characters or fewer.' });
    if (parentId !== null && !mongoose.Types.ObjectId.isValid(parentId))
      return res.status(400).json({ error: 'Invalid payload' });

    const categoryName = category.trim();

    await ensureCategoryAnchor(categoryName, req.user._id);

    const resolvedParentId = parentId ? new mongoose.Types.ObjectId(parentId) : null;

    // Return the existing item if this post is already in the sidebar at this location.
    const existing = await SidebarItem.findOne({
      postId: new mongoose.Types.ObjectId(postId),
      category: categoryName,
      parentId: resolvedParentId,
    });
    if (existing) return res.status(200).json({ success: true, item: existing, duplicate: true });

    const order = await SidebarItem.countDocuments({ parentId: resolvedParentId, category: categoryName });

    const item = await SidebarItem.create({
      title: title.trim(),
      category: categoryName,
      parentId: resolvedParentId,
      postId: new mongoose.Types.ObjectId(postId),
      isFolder: false,
      order,
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Smart-add failed' });
  }
});

/**
 * PATCH /api/sidebar-items/:id
 * Rename an item. Only the creator may rename.
 */
router.patch('/sidebar-items/:id', requireAuth, async (req, res) => {
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

/**
 * PATCH /api/sidebar-items/:id/move
 * Moves an item to a new category and/or parent folder.
 */
router.patch('/sidebar-items/:id/move', requireAuth, async (req, res) => {
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
      if (!parent.isFolder) return res.status(400).json({ error: 'Destination must be a folder' });
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
 * Cascade-deletes the item and all its descendants plus their linked posts.
 * Blocked if any descendant was created by a different user.
 */
router.delete('/sidebar-items/:id', requireAuth, async (req, res) => {
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
                  in: { id: '$$d._id', createdBy: '$$d.createdBy', postId: '$$d.postId', title: '$$d.title' },
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
    return res.status(500).json({ error: 'Delete failed' });
  }
});

/* ── Categories ────────────────────────────────────────────────────────────── */

/**
 * POST /api/sidebar/categories
 */
router.post('/sidebar/categories', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ error: 'Category name is required' });
    if (name.trim().length > 50)
      return res.status(400).json({ error: 'Category name must be 50 characters or fewer.' });

    const categoryName = name.trim();

    const existing = await SidebarItem.findOne({
      category: categoryName, parentId: null, isFolder: true, title: categoryName,
    });
    if (existing) return res.status(409).json({ error: 'Category already exists' });

    const order = await SidebarItem.countDocuments({ parentId: null, category: categoryName });
    const item = await SidebarItem.create({
      title: categoryName,
      category: categoryName,
      parentId: null,
      postId: null,
      isFolder: true,
      order,
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, item });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Category creation failed' });
  }
});

/**
 * GET /api/sidebar/categories
 * Public. Returns the full nested category tree.
 */
router.get('/sidebar/categories', async (_req, res) => {
  try {
    const items = await SidebarItem.find()
      .populate('postId', '_id title category tags body status')
      .sort({ category: 1, order: 1, createdAt: 1 });

    // Filter out sidebar items whose linked post is not published.
    const publishedItems = items.filter((item) => {
      if (!item.postId) return true; // folders have no postId — always keep
      if (typeof item.postId === 'object' && item.postId.status) {
        return item.postId.status === 'published';
      }
      return true; // no status field means legacy 'published'
    });

    const groups = new Map();
    publishedItems.forEach((item) => {
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
 * Only the creator may delete. Blocked if any item inside belongs to another user.
 * Cascade-deletes all SidebarItems AND Post documents in the category.
 */
router.delete('/sidebar/categories/:id', requireAuth, async (req, res) => {
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

export default router;
