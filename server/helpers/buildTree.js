/**
 * Converts a flat array of SidebarItems into a nested tree structure.
 * Items with no parentId become root nodes; items with a parentId are
 * attached as children of their parent.
 */
const buildTree = (items) => {
  const itemMap = new Map();
  const roots = [];

  items.forEach((item) => {
    const obj = item.toObject ? item.toObject() : item;
    obj.children = [];
    itemMap.set(String(obj._id), obj);
  });

  items.forEach((item) => {
    const id = String(item._id);
    const current = itemMap.get(id);
    if (item.parentId) {
      const parent = itemMap.get(String(item.parentId));
      if (parent) parent.children.push(current);
      else roots.push(current);
    } else {
      roots.push(current);
    }
  });

  return roots;
};

export default buildTree;
