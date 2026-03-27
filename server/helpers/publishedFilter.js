/**
 * Mongo query fragment that matches published posts.
 *
 * Legacy posts were created before the `status` field existed and have
 * no status set, so we treat them as published too.
 */
const PUBLISHED_FILTER = {
  $or: [{ status: 'published' }, { status: { $exists: false } }],
};

export default PUBLISHED_FILTER;
