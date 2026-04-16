// eslint-disable-next-line import/no-cycle, max-classes-per-file
import { loadIms } from './scripts.js';

/**
 * Checks if the user is signed in via Adobe IMS.
 * @returns {Promise<boolean>} - True if the user is signed in, otherwise false.
 */
export async function isSignedInUser() {
  try {
    await loadIms();
    return window?.adobeIMS?.isSignedInUser() || false;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error checking sign-in status:', error);
    return false;
  }
}

/**
 * Fetches user data from Adobe IMS.
 * @returns {Promise<Object>} - The user data, including image, id, and name.
 */
export async function getUserData() {
  try {
    await loadIms();
    const profile = await window.adobeIMS.getProfile();

    return {
      id: profile.userId,
      name: profile.displayName,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching user data:', error);
    return {
      id: null,
      name: 'Unknown',
    };
  }
}
