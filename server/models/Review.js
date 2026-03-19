import mongoose from 'mongoose';

const reviewerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'changes_requested'],
    default: 'pending',
  },
  comment: {
    type: String,
    default: '',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reviewers: [reviewerSchema],
  overallStatus: {
    type: String,
    enum: ['pending', 'approved', 'changes_requested'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

reviewSchema.pre('save', function updateTimestamp() {
  this.updatedAt = Date.now();
});

reviewSchema.index({ postId: 1 });
reviewSchema.index({ 'reviewers.userId': 1, 'reviewers.status': 1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
