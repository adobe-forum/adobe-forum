import { Router } from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Post from '../models/Post.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/reviews
 * Create a Review document. Body: { postId, reviewerIds: [] }
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { postId, reviewerIds } = req.body;

    if (!postId || !Array.isArray(reviewerIds) || reviewerIds.length === 0)
      return res.status(400).json({ error: 'postId and at least one reviewerId are required.' });
    if (reviewerIds.length > 5)
      return res.status(400).json({ error: 'Maximum 5 reviewers allowed.' });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const review = await Review.create({
      postId: new mongoose.Types.ObjectId(postId),
      authorId: post.createdBy,
      reviewers: reviewerIds.map((id) => ({
        userId: new mongoose.Types.ObjectId(id),
        status: 'pending',
        comment: '',
        updatedAt: new Date(),
      })),
      overallStatus: 'pending',
    });

    return res.status(201).json({ success: true, review });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Review creation failed.' });
  }
});

/**
 * GET /api/reviews/pending
 * Returns all reviews where the logged-in user is a reviewer with status 'pending'.
 */
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const reviews = await Review.find({
      'reviewers.userId': req.user._id,
      'reviewers.status': 'pending',
    })
      .populate('postId', 'title category status')
      .populate('authorId', 'firstName lastName email')
      .populate('reviewers.userId', 'firstName lastName email');

    // Secondary filter: MongoDB's compound index query may return reviews where
    // a *different* reviewer on the same document is pending. Keep only reviews
    // where THIS user's own entry is still pending.
    const filtered = reviews.filter((r) =>
      r.reviewers.some((rv) => {
        const rvId = rv.userId && typeof rv.userId === 'object' ? rv.userId._id : rv.userId;
        return String(rvId) === String(req.user._id) && rv.status === 'pending';
      })
    );

    return res.json({ success: true, reviews: filtered });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch pending reviews.' });
  }
});

/**
 * GET /api/reviews/author-notifications
 * Returns reviews for the logged-in author where there is an unseen decision.
 */
router.get('/author-notifications', requireAuth, async (req, res) => {
  try {
    const reviews = await Review.find({
      authorId: req.user._id,
      $or: [
        { overallStatus: 'changes_requested' },
        { overallStatus: 'approved', authorNotified: false },
      ],
    })
      .populate('postId', 'title status')
      .populate('reviewers.userId', 'firstName lastName');

    return res.json({ success: true, reviews });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch author notifications.' });
  }
});

/**
 * PATCH /api/reviews/:id/dismiss-notification
 * Marks a review notification as seen by the author.
 */
router.patch('/:id/dismiss-notification', requireAuth, async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, authorId: req.user._id });
    if (!review) return res.status(404).json({ error: 'Review not found.' });

    review.authorNotified = true;
    await review.save();
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to dismiss notification.' });
  }
});

/**
 * GET /api/reviews/by-post/:postId
 * Returns the review document for a given post.
 */
router.get('/by-post/:postId', requireAuth, async (req, res) => {
  try {
    const review = await Review.findOne({
      postId: new mongoose.Types.ObjectId(req.params.postId),
    })
      .populate('authorId', 'firstName lastName email')
      .populate('reviewers.userId', 'firstName lastName email');

    if (!review) return res.status(404).json({ error: 'No review found for this post.' });
    return res.json({ success: true, review });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch review.' });
  }
});

/**
 * GET /api/reviews/my-requests
 * Returns all reviews where the logged-in user is the author.
 */
router.get('/my-requests', requireAuth, async (req, res) => {
  try {
    const reviews = await Review.find({ authorId: req.user._id })
      .populate('postId', 'title category status')
      .populate('reviewers.userId', 'firstName lastName email');
    return res.json({ success: true, reviews });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch your review requests.' });
  }
});

/**
 * PATCH /api/reviews/:id
 * Reviewer submits their decision. Body: { status, comment }
 * Also used by the author to reset all statuses back to pending on re-submit.
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found.' });

    const { status, comment, resetAll } = req.body;

    // Author re-submitting: reset all reviewers to pending.
    if (resetAll && String(review.authorId) === String(req.user._id)) {
      review.reviewers.forEach((rv) => {
        rv.status = 'pending';
        rv.comment = '';
        rv.updatedAt = new Date();
      });
      review.overallStatus = 'pending';
      await review.save();

      await Post.findByIdAndUpdate(review.postId, { status: 'pending_review' });

      return res.json({ success: true, review });
    }

    // Normal reviewer decision.
    if (!status || !['approved', 'changes_requested'].includes(status))
      return res.status(400).json({ error: 'status must be approved or changes_requested.' });

    const entry = review.reviewers.find(
      (rv) => String(rv.userId) === String(req.user._id),
    );
    if (!entry) return res.status(403).json({ error: 'You are not a reviewer for this post.' });

    entry.status = status;
    entry.comment = comment || '';
    entry.updatedAt = new Date();

    // Recalculate overallStatus based on all reviewers.
    const allApproved = review.reviewers.every((rv) => rv.status === 'approved');
    const anyChangesRequested = review.reviewers.some((rv) => rv.status === 'changes_requested');

    const previousStatus = review.overallStatus;

    if (allApproved) {
      review.overallStatus = 'approved';
      await Post.findByIdAndUpdate(review.postId, { status: 'published' });
    } else if (anyChangesRequested) {
      review.overallStatus = 'changes_requested';
      await Post.findByIdAndUpdate(review.postId, { status: 'changes_requested' });
    } else {
      review.overallStatus = 'pending';
    }

    // Reset the author-notified flag whenever the overall status changes.
    if (review.overallStatus !== 'pending' && previousStatus !== review.overallStatus) {
      review.authorNotified = false;
    }

    await review.save();
    return res.json({ success: true, review });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Review update failed.' });
  }
});

export default router;
