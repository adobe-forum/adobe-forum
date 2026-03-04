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
  // Tracks which user created this sidebar item (folder or post link).
  // Used for ownership checks on rename/delete.
  // Optional (null) for items created before this field was added.
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Fields for nested folder structure
  isFolder: {
    type: Boolean,
    default: false
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SidebarItem',
    default: null,
  },
  path: {
    type: String,
    default: '', // e.g., "React > Hooks > useState"
  },
  // Auto-nesting tags for related content (e.g., ES6 features)
  relatedTags: [{
    type: String,
  }],
  order: {
    type: Number,
    default: 0,
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

// Indexes for efficient queries
sidebarItemSchema.index({ category: 1, order: 1 });
sidebarItemSchema.index({ postId: 1 });
sidebarItemSchema.index({ parentId: 1 });
sidebarItemSchema.index({ path: 1 });
sidebarItemSchema.index({ isFolder: 1 });
// Index so we can efficiently query "all sidebar items by user X"
sidebarItemSchema.index({ createdBy: 1 });

const SidebarItem = mongoose.model('SidebarItem', sidebarItemSchema);

export default SidebarItem;
