import { Router } from 'express';
import mongoose from 'mongoose';
import Post from '../models/Post.js';
import Review from '../models/Review.js';
import User from '../models/user.js';
import requireAuth from '../middleware/auth.js';
import escapeRegex from '../helpers/escapeRegex.js';
import PUBLISHED_FILTER from '../helpers/publishedFilter.js';

const router = Router();

/**
 * POST /api/posts
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, category, body, tags, status } = req.body;

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
      createdBy: req.user._id,
      ...(status === 'pending_review' ? { status: 'pending_review' } : {}),
    });

    return res.status(201).json({ success: true, post });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Post creation failed' });
  }
});

/**
 * GET /api/posts?page=1&limit=12&search=&author=&sort=latest
 *
 * Search covers: title, category, tags (partial), body, and author name.
 * Author filter: pass ?author=<userId> to show only that user's posts.
 * Pass ?mine=true to show all of the logged-in user's posts regardless of status.
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 12);
    const search = req.query.search?.trim();
    const category = req.query.category?.trim();
    const author = req.query.author?.trim();
    const isMine = req.query.mine === 'true';

    const query = {};

    if (author) {
      query.createdBy = mongoose.Types.ObjectId.isValid(author)
        ? new mongoose.Types.ObjectId(author)
        : author;
    }

    if (isMine && req.session?.userId) {
      // Show all posts belonging to the logged-in user, regardless of status.
      query.createdBy = new mongoose.Types.ObjectId(req.session.userId);
    } else {
      query.$and = query.$and || [];
      query.$and.push(PUBLISHED_FILTER);
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), 'i');

      const matchingUsers = await User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
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

      const searchFilter = {
        $or: [
          { title: searchRegex },
          { category: searchRegex },
          { tags: searchRegex },
          { body: searchRegex },
          ...(userIds.length > 0 ? [{ createdBy: { $in: userIds } }] : []),
        ],
      };

      query.$and = query.$and || [];
      query.$and.push(searchFilter);
    }

    if (category) {
      query.$and = query.$and || [];
      query.$and.push({ category });
    }

    if (query.$and && query.$and.length === 0) delete query.$and;

    const sortOption = req.query.sort || 'latest';
    let sortObj = { createdAt: -1 };
    if (sortOption === 'oldest') sortObj = { createdAt: 1 };
    if (sortOption === 'most_viewed') sortObj = { views: -1 };

    let posts, total;

    if (sortOption === 'most_liked') {
      // Aggregation is needed because `likes` is an array — we have to compute its length.
      const pipeline = [
        { $match: query },
        { $addFields: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
        { $sort: { likesCount: -1, createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdByObj',
          },
        },
        { $addFields: { createdBy: { $arrayElemAt: ['$createdByObj', 0] } } },
        { $project: { createdByObj: 0 } },
      ];

      const [aggResult, countResult] = await Promise.all([
        Post.aggregate(pipeline),
        Post.aggregate([{ $match: query }, { $count: 'total' }]),
      ]);

      posts = aggResult;
      total = countResult.length > 0 ? countResult[0].total : 0;
    } else {
      const [findResult, countResult] = await Promise.all([
        Post.find(query)
          .populate('createdBy', 'firstName lastName')
          .sort(sortObj)
          .skip((page - 1) * limit)
          .limit(limit),
        Post.countDocuments(query),
      ]);
      posts = findResult;
      total = countResult;
    }

    return res.json({
      success: true,
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalCount: total,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * GET /api/posts/notifications
 * Returns unread post notifications for the logged-in user.
 */
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('notifications.actor', 'firstName lastName')
      .populate('notifications.post', 'title');

    if (!user) return res.status(404).json({ error: 'User not found' });

    const notifications = (user.notifications || [])
      .filter((notification) => !notification.read)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ success: true, notifications });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch post notifications' });
  }
});

/**
 * GET /api/posts/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('createdBy', 'firstName lastName');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ success: true, post });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch post' });
  }
});

/**
 * POST /api/posts/:id/view
 * Securely tracks unique views by User ID.
 */
router.post('/:id/view', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const userId = req.user._id;

    if (!post.viewedBy.includes(userId)) {
      post.viewedBy.push(userId);
      post.views = (post.views || 0) + 1;
      await post.save();
    }

    await post.populate('createdBy', 'firstName lastName');
    return res.json({ success: true, post });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update view status' });
  }
});

/**
 * POST /api/posts/:id/like
 * Toggles the like status for the current user.
 */
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const userId = req.user._id;
    const hasLiked = post.likes.includes(userId);

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      hasLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
      { new: true },
    ).populate('createdBy', 'firstName lastName');

    if (!hasLiked && post.createdBy && String(post.createdBy) !== String(userId)) {
      await User.findByIdAndUpdate(post.createdBy, {
        $pull: {
          notifications: {
            type: 'post_like',
            actor: userId,
            post: post._id,
          },
        },
      });

      await User.findByIdAndUpdate(post.createdBy, {
        $push: {
          notifications: {
            type: 'post_like',
            actor: userId,
            post: post._id,
            message: 'liked your post',
            read: false,
            createdAt: new Date(),
          },
        },
      });
    }

    return res.json({ success: true, post: updatedPost });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update like status' });
  }
});

/**
 * PATCH /api/posts/notifications/:notificationId/read
 * Marks a post notification as read for the logged-in user.
 */
router.patch('/notifications/:notificationId/read', requireAuth, async (req, res) => {
  try {
    const result = await User.updateOne(
      { _id: req.user._id, 'notifications._id': req.params.notificationId },
      { $set: { 'notifications.$.read': true } },
    );

    if (!result.matchedCount) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * PATCH /api/posts/:id
 * Only the post creator may edit. If a rejected post is edited, it is
 * automatically resubmitted for review.
 */
router.patch('/:id', requireAuth, async (req, res) => {
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

    // If the post was rejected and is being edited, automatically resubmit for review.
    if (post.status === 'changes_requested') {
      post.status = 'pending_review';
      const review = await Review.findOne({ postId: post._id });
      if (review) {
        review.reviewers.forEach((rv) => {
          rv.status = 'pending';
          rv.comment = '';
          rv.updatedAt = new Date();
        });
        review.overallStatus = 'pending';
        review.authorNotified = false;
        await review.save();
      }
    }

    await post.save();
    return res.json({ success: true, post });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Post update failed' });
  }
});

export default router;
