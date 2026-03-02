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
  // NEW: Link the post to the user who created it
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, 
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

const Post = mongoose.model('Post', postSchema);

export default Post;