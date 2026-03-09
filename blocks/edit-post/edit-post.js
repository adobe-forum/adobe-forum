/**
 * edit-post block — thin wrapper around create-post.
 * The create-post block already handles edit mode via sessionStorage,
 * so all we need to do is invoke its decorate function.
 */
import decorate from '../create-post/create-post.js';

export default decorate;
