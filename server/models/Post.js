import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    minlength: 15,
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
