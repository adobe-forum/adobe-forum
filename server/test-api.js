#!/usr/bin/env node
/**
 * API Test Suite for Adobe Forum
 * Demonstrates all major endpoints and features
 * 
 * Usage: node server/test-api.js
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  test: (msg) => console.log(`\n${colors.cyan}→${colors.reset} ${msg}`),
  data: (data) => console.log(`${colors.yellow}${JSON.stringify(data, null, 2)}${colors.reset}`),
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHealthCheck() {
  log.test('Testing Health Check');
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    log.success(`Server is healthy: ${response.data.message}`);
    return true;
  } catch (error) {
    log.error(`Health check failed: ${error.message}`);
    return false;
  }
}

async function testCreatePost() {
  log.test('Testing Post Creation');
  try {
    const postData = {
      title: 'Understanding Async/Await in JavaScript',
      category: 'JavaScript',
      body: 'Async/await is a modern way to handle asynchronous operations in JavaScript. It makes code more readable and maintainable compared to promises.',
      tags: ['async', 'javascript', 'es6'],
    };

    const response = await axios.post(`${BASE_URL}/api/posts`, postData);
    log.success(`Post created: ${response.data.post._id}`);
    return response.data.post._id;
  } catch (error) {
    log.error(`Failed to create post: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function testCreatePost2() {
  log.test('Testing Second Post Creation');
  try {
    const postData = {
      title: 'React Hooks: useState and useEffect',
      category: 'React',
      body: 'Hooks allow you to use state and other React features without writing a class component.',
      tags: ['react', 'hooks', 'frontend'],
    };

    const response = await axios.post(`${BASE_URL}/api/posts`, postData);
    log.success(`Post created: ${response.data.post._id}`);
    return response.data.post._id;
  } catch (error) {
    log.error(`Failed to create post: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function testCreateSidebarItem(postId, parentId = null) {
  log.test('Testing Sidebar Item Creation');
  try {
    const itemData = {
      title: 'Advanced Async Patterns',
      category: 'JavaScript',
      postId,
      parentId,
      icon: '📄',
    };

    const response = await axios.post(`${BASE_URL}/api/sidebar-items`, itemData);
    log.success(`Sidebar item created: ${response.data.item._id}`);
    return response.data.item._id;
  } catch (error) {
    log.error(`Failed to create sidebar item: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function testSmartAdd(postId) {
  log.test('Testing Smart-Add Endpoint');
  try {
    const smartAddData = {
      title: 'Advanced Async Patterns',
      category: 'JavaScript',
      postId,
    };

    const response = await axios.post(`${BASE_URL}/api/sidebar-items/smart-add`, smartAddData);
    log.success(`Smart-add succeeded: action=${response.data.action}`);
    log.info(`Response: ${response.data.action}`);
    return response.data.item._id;
  } catch (error) {
    log.error(`Smart-add failed: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function testSmartAddDuplicate(postId1, postId2) {
  log.test('Testing Smart-Add with Duplicate Detection');
  try {
    // First add
    const firstAdd = await axios.post(`${BASE_URL}/api/sidebar-items/smart-add`, {
      title: 'Advanced Async Patterns',
      category: 'JavaScript',
      postId: postId1,
    });

    log.success(`First item created: ${firstAdd.data.item._id}`);
    await delay(500);

    // Second add with same title/category - should transform
    const secondAdd = await axios.post(`${BASE_URL}/api/sidebar-items/smart-add`, {
      title: 'Advanced Async Patterns',
      category: 'JavaScript',
      postId: postId2,
    });

    log.success(`Duplicate detected and transformed! Action: ${secondAdd.data.action}`);
    if (secondAdd.data.action === 'transformed_to_folder') {
      log.info(`Parent is now a folder with ${secondAdd.data.parent.children?.length || 0} children`);
    }
    return secondAdd.data.parent._id;
  } catch (error) {
    log.error(`Smart-add duplicate test failed: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function testFetchCategories() {
  log.test('Testing Fetch Categories Endpoint');
  try {
    const response = await axios.get(`${BASE_URL}/api/sidebar/categories`);
    log.success(`Categories fetched: ${response.data.categories.length} categories`);
    log.info(`Total items: ${response.data.totalItems}`);
    
    response.data.categories.forEach(cat => {
      log.info(`  - ${cat.name}: ${cat.items.length} root items`);
    });
    
    return response.data.categories;
  } catch (error) {
    log.error(`Failed to fetch categories: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function testFetchSidebarItems() {
  log.test('Testing Fetch All Sidebar Items');
  try {
    const response = await axios.get(`${BASE_URL}/api/sidebar-items`);
    log.success(`Sidebar items fetched: tree has ${response.data.items.length} root items`);
    log.info(`Total flat items: ${response.data.flatItems.length}`);
    return response.data;
  } catch (error) {
    log.error(`Failed to fetch sidebar items: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function testDeleteItem(itemId) {
  log.test(`Testing Delete Item (ID: ${itemId})`);
  try {
    const response = await axios.delete(`${BASE_URL}/api/sidebar-items/${itemId}`);
    log.success(`Item deleted: ${response.data.message}`);
    return true;
  } catch (error) {
    log.error(`Failed to delete item: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function testUpdateItem(itemId) {
  log.test(`Testing Update Item (ID: ${itemId})`);
  try {
    const response = await axios.put(`${BASE_URL}/api/sidebar-items/${itemId}`, {
      title: 'Updated Title',
      icon: '⭐',
    });
    log.success(`Item updated: ${response.data.message}`);
    return true;
  } catch (error) {
    log.error(`Failed to update item: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function runAllTests() {
  log.info('Starting Adobe Forum API Test Suite...\n');

  // Check if server is running
  const serverHealthy = await testHealthCheck();
  if (!serverHealthy) {
    log.error('Server is not running. Start it with: npm start');
    process.exit(1);
  }

  await delay(1000);

  // Create posts
  const postId1 = await testCreatePost();
  const postId2 = await testCreatePost2();
  await delay(500);

  if (!postId1 || !postId2) {
    log.error('Could not create posts');
    process.exit(1);
  }

  // Test smart-add with duplicate transformation
  await testSmartAddDuplicate(postId1, postId2);
  await delay(500);

  // Fetch all items
  const items = await testFetchSidebarItems();
  await delay(500);

  // Fetch categorized structure
  const categories = await testFetchCategories();
  await delay(500);

  if (categories && categories.length > 0 && categories[0].items.length > 0) {
    const itemToUpdate = categories[0].items[0]._id;
    await testUpdateItem(itemToUpdate);
  }

  log.success('All tests completed!');
}

// Run tests
runAllTests().catch(error => {
  log.error(`Test suite failed: ${error.message}`);
  process.exit(1);
});
