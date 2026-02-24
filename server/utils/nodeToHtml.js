/**
 * Converts Preact node trees into valid HTML strings.
 * Handles:
 * - Null/undefined values
 * - String values
 * - Node arrays
 * - Preact h() objects with tag, attributes, and children
 * - Self-closing tags (img, br, hr, etc.)
 * - Attribute serialization with proper escaping
 *
 * @param {*} node - The Preact node to convert
 * @returns {string} - The HTML string representation
 */
export const nodeToHtml = (node) => {
  // Handle null/undefined
  if (node == null) return '';

  // Handle plain strings
  if (typeof node === 'string') return node;

  // Handle arrays of nodes
  if (Array.isArray(node)) return node.map(nodeToHtml).join('');

  // Handle Preact h() objects
  const { tag, attributes = {}, children = [] } = node;

  // Build attribute string
  const attrs = Object.entries(attributes || {})
    .map(([k, v]) => {
      if (v == null) return '';

      let val = v;
      // Handle complex attribute values (objects with uri, src, etc.)
      if (typeof v === 'object') {
        val = v.uri || v.src || JSON.stringify(v);
      }

      // Warn about invalid image sources
      if (tag === 'img' && k === 'src') {
        if (typeof val === 'string' && !val.startsWith('data:') && !/^https?:\/\//.test(val)) {
          console.warn('Image src is not a data URI or http(s) URL:', val);
        }
      }

      // Escape quotes in attribute values
      return `${k}="${String(val).replace(/"/g, '&quot;')}"`;
    })
    .filter(Boolean)
    .join(' ');

  // Build opening tag
  const openTag = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;

  // Self-closing tags that don't need closing tags
  const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];

  // Build inner HTML recursively
  const innerHtml = nodeToHtml(children);

  // Return self-closing or normal HTML
  if (selfClosingTags.includes(tag)) {
    return openTag;
  }

  return `${openTag}${innerHtml}</${tag}>`;
};

/**
 * Strips HTML tags from a string to validate minimum character requirements.
 * Used to validate the "minimum 20 characters" requirement for post bodies.
 *
 * @param {string} htmlString - The HTML string to strip
 * @returns {string} - The plain text without HTML tags
 */
export const stripHtmlTags = (htmlString) => {
  return String(htmlString).replace(/<[^>]*>/g, '').trim();
};

/**
 * Processes a post body: converts Preact nodes to HTML if needed,
 * removes tags from body content, and validates minimum length.
 *
 * @param {*} body - The body content (string or Preact nodes)
 * @param {Array<string>} tags - Array of tags to remove from content
 * @returns {{htmlBody: string, plainText: string, isValid: boolean, errorMessage: string|null}}
 */
export const processPostBody = (body, tags = []) => {
  let bodyHtml = '';

  // Convert body to HTML
  if (body == null) {
    bodyHtml = '';
  } else if (typeof body === 'string') {
    bodyHtml = body;
  } else {
    bodyHtml = nodeToHtml(body);
  }

  // Remove body content matching the tags provided
  if (tags && Array.isArray(tags) && tags.length > 0) {
    tags.forEach((t) => {
      if (!t) return;
      // Properly escape regex special characters
      const escapedTag = String(t).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedTag}\\b`, 'g');
      bodyHtml = bodyHtml.replace(regex, '');
    });
  }

  // Strip HTML and get plain text for validation
  const plainText = stripHtmlTags(bodyHtml);

  // Validate minimum length
  const isValid = plainText.length >= 20;
  const errorMessage = !isValid ? `Body must be at least 20 characters. Current length: ${plainText.length}` : null;

  return {
    htmlBody: bodyHtml,
    plainText,
    isValid,
    errorMessage,
  };
};
