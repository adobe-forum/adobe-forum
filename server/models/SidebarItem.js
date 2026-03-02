import mongoose from 'mongoose';

const sidebarItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: '📄',
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: false,
  },
  isFolder: {
    type: Boolean,
    default: false,
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SidebarItem',
    default: null,
  },
  path: {
    type: String,
    default: '', 
  },
  relatedTags: [{
    type: String,
  }],
  order: {
    type: Number,
    default: 0,
  },
  // NEW: Link the sidebar item/folder to the user who created it
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
sidebarItemSchema.pre('save', function updateTimestamp() {
  this.updatedAt = Date.now();
});

// Index for efficient queries
sidebarItemSchema.index({ category: 1, order: 1 });
sidebarItemSchema.index({ postId: 1 });
// NEW: Index by creator for faster lookups later if we want a "My Posts" view
sidebarItemSchema.index({ createdBy: 1 });

const SidebarItem = mongoose.model('SidebarItem', sidebarItemSchema);

export default SidebarItem;