/**
 * Escapes special regex characters in a string so it can be used
 * safely inside a RegExp constructor.
 */
const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default escapeRegex;
