import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 150,
  },
  category: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
    minlength: 20,
  },
  tags: [{
    type: String,
  }],
  views: {
    type: Number,
    default: 0,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Tracks which user created this post.
  // Used for ownership checks on edit/delete.
  // Optional (null) for posts created before this field was added.
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
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

// Update the updatedAt timestamp before saving
postSchema.pre('save', function updateTimestamp() {
  this.updatedAt = Date.now();
});

// Index so we can efficiently query "all posts by user X"
postSchema.index({ createdBy: 1 });

const Post = mongoose.model('Post', postSchema);

export default Post;