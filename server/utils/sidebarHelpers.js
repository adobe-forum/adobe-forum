/**
 * Converts a flat array of sidebar items into a nested tree structure.
 * Items with a parentId are nested under their parent.
 *
 * @param {Array<Object>} items - Array of sidebar items
 * @returns {Array<Object>} - Array of root items with nested children
 */
export const buildTree = (items) => {
  const itemMap = new Map();
  const rootItems = [];

  // Create a map of all items by their ID and initialize children array
  items.forEach((item) => {
    const itemObj = item.toObject ? item.toObject() : item;
    itemObj.children = [];
    itemMap.set(itemObj._id.toString(), itemObj);
  });

  // Build parent-child relationships
  items.forEach((item) => {
    const itemObj = itemMap.get(item._id.toString());

    if (item.parentId) {
      // Item has a parent - add it as a child
      const parent = itemMap.get(item.parentId.toString());
      if (parent) {
        parent.children.push(itemObj);
      } else {
        // Parent not found - treat as root
        rootItems.push(itemObj);
      }
    } else {
      // No parent - it's a root item
      rootItems.push(itemObj);
    }
  });

  return rootItems;
};

/**
 * Recursively deletes a sidebar item and all its descendants.
 * Post documents are preserved - only sidebar references are removed.
 *
 * @param {Model} SidebarItem - The Mongoose SidebarItem model
 * @param {ObjectId} itemId - The ID of the item to delete
 */
export const recursivelyDeleteSidebarItem = async (SidebarItem, itemId) => {
  const item = await SidebarItem.findById(itemId);
  if (!item) return;

  // If it's a folder, recursively delete all children
  if (item.isFolder) {
    const children = await SidebarItem.find({ parentId: itemId });
    for (const child of children) {
      await recursivelyDeleteSidebarItem(SidebarItem, child._id);
    }
  }

  // Delete the item itself (Post documents are preserved)
  await SidebarItem.findByIdAndDelete(itemId);
};

/**
 * Groups sidebar items by category and builds a tree for each category.
 *
 * @param {Array<Object>} items - Array of sidebar items
 * @returns {Array<Object>} - Array of category objects with their items in tree structure
 */
export const groupByCategoryAndBuildTrees = (items) => {
  const categoryMap = new Map();

  // Group items by category
  items.forEach((item) => {
    const catName = item.category;
    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, []);
    }

    // Warn if a non-folder item doesn't have a postId
    if (!item.postId && !item.isFolder) {
      console.warn(`Warning: Item "${item.title}" has no postId and is not a folder`);
    }

    categoryMap.get(catName).push(item);
  });

  // Build tree for each category
  const categories = [];

  categoryMap.forEach((categoryItems, categoryName) => {
    const tree = buildTree(categoryItems);

    categories.push({
      id: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: categoryName,
      icon: '📁',
      items: tree,
    });
  });

  // Sort categories alphabetically by name
  categories.sort((a, b) => a.name.localeCompare(b.name));

  return categories;
};
