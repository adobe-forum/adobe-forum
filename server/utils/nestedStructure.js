/**
 * Creates a nested structure of sidebar items based on a hierarchical path.
 * For example, path "React > Hooks > useState" creates folders for React and Hooks,
 * and places the final item (useState) under those folders.
 *
 * @param {Model} SidebarItem - The Mongoose SidebarItem model
 * @param {string} pathString - Hierarchical path separated by '>'
 * @param {ObjectId} postId - The post ID for the final item
 * @param {string} category - The category for all items
 * @param {string} title - The title of the final item
 * @param {string} icon - The icon for the final item (default: '📄')
 * @returns {Promise<Object>} - The saved final SidebarItem document
 */
export const createNestedStructure = async (
  SidebarItem,
  pathString,
  postId,
  category,
  title,
  icon,
) => {
  // If no path provided, create a root-level item
  if (!pathString || !pathString.trim()) {
    const newItem = new SidebarItem({
      title,
      category,
      icon: icon || '📄',
      postId,
      isFolder: false,
      parentId: null,
      path: '',
    });
    return newItem.save();
  }

  // Split path into parts and filter out empty parts
  const parts = pathString.split('>').map((p) => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    const newItem = new SidebarItem({
      title,
      category,
      icon: icon || '📄',
      postId,
      isFolder: false,
      parentId: null,
      path: '',
    });
    return newItem.save();
  }

  let parentId = null;
  let currentPath = '';

  // Create folders for all parts except the last one
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;
    currentPath = currentPath ? `${currentPath} > ${part}` : part;

    if (isLastPart) {
      // Create the final item with the actual title and postId
      const contentItem = new SidebarItem({
        title: part,
        category,
        icon: icon || '📄',
        postId,
        isFolder: false,
        parentId,
        path: currentPath,
      });
      return contentItem.save();
    }

    // Check if folder exists; create if it doesn't
    let folder = await SidebarItem.findOne({
      category,
      title: part,
      isFolder: true,
      parentId,
    });

    if (!folder) {
      folder = new SidebarItem({
        title: part,
        category,
        icon: '📁',
        postId: null,
        isFolder: true,
        parentId,
        path: currentPath,
      });
      await folder.save();
    }

    // Use this folder as the parent for the next item
    parentId = folder._id;
  }

  return null;
};
