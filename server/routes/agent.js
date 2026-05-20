/* eslint-disable no-console */
import { Router } from 'express';
import Post from '../models/Post.js';
import Review from '../models/Review.js';
import requireAuth from '../middleware/auth.js';
import { callLLM, parseJsonResponse } from '../utils/llm.js';

const router = Router();

function buildCheckFallback(reason = 'AI check is unavailable right now.') {
  return {
    passed: true,
    summary: reason,
    codeIssues: [],
    docIssues: [],
    suggestedTags: [],
    reviewerHint: 'Proceed with human review as usual.',
    skipped: true,
  };
}

function buildAutoReviewFallback(reason = 'AI review could not be generated.') {
  return {
    overallScore: 0,
    recommendation: 'needs_revision',
    reasoning: reason,
    codeReview: {
      issues: [],
      suggestions: [],
      positives: [],
    },
    documentationReview: {
      issues: [],
      suggestions: [],
      completenessScore: 0,
    },
    securityFlags: [],
    checklist: [],
    skipped: true,
  };
}

function buildCheckPrompt({
  title,
  body,
  tags,
  category,
}) {
  return [
    'You are reviewing a draft internal engineering forum post.',
    'Return JSON only. No markdown or prose outside JSON.',
    'Assess clarity, code quality, documentation quality, and categorization.',
    'Use this exact shape:',
    '{"passed":boolean,"summary":"string","codeIssues":["string"],"docIssues":["string"],"suggestedTags":["string"],"reviewerHint":"string","skipped":false}',
    '',
    `Title: ${title}`,
    `Category: ${category}`,
    `Tags: ${(tags || []).join(', ')}`,
    'Body:',
    body,
  ].join('\n');
}

function buildAutoReviewPrompt(post) {
  return [
    'You are performing a first-pass technical review for an internal developer forum post.',
    'Return JSON only. No markdown or prose outside JSON.',
    'Evaluate code quality, documentation quality, safety, and publish readiness.',
    'Use this exact JSON shape:',
    '{"overallScore":number,"recommendation":"approve"|"needs_revision"|"reject","reasoning":"string","codeReview":{"issues":["string"],"suggestions":["string"],"positives":["string"]},"documentationReview":{"issues":["string"],"suggestions":["string"],"completenessScore":number},"securityFlags":["string"],"checklist":[{"item":"string","passed":boolean,"note":"string"}]}',
    '',
    `Title: ${post.title}`,
    `Category: ${post.category}`,
    `Tags: ${(post.tags || []).join(', ')}`,
    'Body:',
    post.body,
  ].join('\n');
}

function decodeHtmlEntities(value = '') {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtmlTags(value = '') {
  return value.replace(/<[^>]+>/g, '');
}

function extractLanguageFromAttributes(attrs = '', codeAttrs = '') {
  const combined = `${attrs} ${codeAttrs}`;
  const dataLangMatch = combined.match(/data-language=["']([^"']+)["']/i);
  if (dataLangMatch) return dataLangMatch[1].toLowerCase();

  const classMatch = combined.match(/(?:code-lang-|language-)([a-z0-9#+-]+)/i);
  if (classMatch) return classMatch[1].toLowerCase();

  return 'plaintext';
}

function extractCodeBlocksFromHtml(html = '') {
  const matches = [...html.matchAll(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/gi)];

  return matches.map((match, index) => {
    const preAttrs = match[1] || '';
    const preContent = match[2] || '';
    const codeMatch = preContent.match(/<code\b([^>]*)>([\s\S]*?)<\/code>/i);
    const codeAttrs = codeMatch?.[1] || '';
    const rawCode = codeMatch?.[2] || preContent;
    const normalizedCode = decodeHtmlEntities(stripHtmlTags(rawCode)).trim();

    return {
      blockIndex: index,
      language: extractLanguageFromAttributes(preAttrs, codeAttrs),
      code: normalizedCode,
    };
  }).filter((block) => block.code);
}

function buildDocsPrompt({ language, code }) {
  return [
    `Generate documentation for this ${language} code snippet from an internal developer forum.`,
    'Respond with ONLY a JSON object. Do not write any text, explanation, or markdown before or after the JSON.',
    'The JSON object must use this exact shape:',
    '{"summary":"string","parameters":[{"name":"string","type":"string","description":"string"}],"returns":"string","usage":"string","dependencies":["string"],"notes":["string"]}',
    '',
    `Language: ${language}`,
    'Code:',
    code,
    '',
    'Output the JSON object now, with no other text:',
  ].join('\n');
}

function buildDocsFallback(language, code, reason = 'Documentation could not be generated.') {
  return {
    language,
    code,
    docs: {
      summary: reason,
      parameters: [],
      returns: '',
      usage: '',
      dependencies: [],
      notes: [],
      skipped: true,
    },
  };
}

async function generateDocsFromBlocks(blocks) {
  const docs = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];

    try {
      // Sequential generation is intentional here because local LM Studio
      // setups time out or disconnect more often under parallel load.
      // eslint-disable-next-line no-await-in-loop
      const raw = await callLLM(buildDocsPrompt(block), { maxTokens: 700 });
      console.log(`[AI Docs] Raw LLM response for block ${block.blockIndex} (lang: ${block.language}):`, raw?.slice(0, 500));
      const parsed = parseJsonResponse(raw, null);

      if (!parsed) {
        console.error(`[AI Docs] Parse failed for block ${block.blockIndex}. Full raw:`, raw);
        docs.push({
          blockIndex: block.blockIndex,
          ...buildDocsFallback(block.language, block.code, 'Documentation response could not be parsed.'),
        });
      } else {
        docs.push({
          blockIndex: block.blockIndex,
          language: block.language,
          code: block.code,
          docs: {
            summary: parsed.summary || '',
            parameters: Array.isArray(parsed.parameters) ? parsed.parameters : [],
            returns: parsed.returns || '',
            usage: parsed.usage || '',
            dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
            notes: Array.isArray(parsed.notes)
              ? parsed.notes
              : (typeof parsed.notes === 'string' && parsed.notes ? [parsed.notes] : []),
          },
        });
      }
    } catch (error) {
      docs.push({
        blockIndex: block.blockIndex,
        ...buildDocsFallback(block.language, block.code),
      });
    }
  }

  return docs;
}

async function generateDocsForPost(post) {
  const blocks = extractCodeBlocksFromHtml(post.body || '');

  if (blocks.length === 0) {
    post.aiDocs = [];
    post.aiDocsGeneratedAt = new Date();
    await post.save();
    return [];
  }

  const docs = await generateDocsFromBlocks(blocks);

  post.aiDocs = docs;
  post.aiDocsGeneratedAt = new Date();
  await post.save();
  return docs;
}

async function loadReviewAccess(postId, userId) {
  const [post, review] = await Promise.all([
    Post.findById(postId),
    Review.findOne({ postId }),
  ]);

  if (!post) {
    return {
      post: null,
      review: null,
      canAccess: false,
      isOwner: false,
    };
  }

  const isOwner = String(post.createdBy || '') === String(userId);
  const isReviewer = !!review?.reviewers?.some((entry) => String(entry.userId) === String(userId));

  return {
    post,
    review,
    canAccess: isOwner || isReviewer,
    isOwner,
  };
}

router.post('/check', requireAuth, async (req, res) => {
  try {
    const {
      title = '',
      body = '',
      tags = [],
      category = '',
    } = req.body || {};

    const prompt = buildCheckPrompt({
      title,
      body,
      tags: Array.isArray(tags) ? tags : [],
      category,
    });

    try {
      const raw = await callLLM(prompt, { maxTokens: 600 });
      const parsed = parseJsonResponse(raw, null);

      if (!parsed) {
        return res.json(buildCheckFallback('AI check returned an unreadable response.'));
      }

      return res.json({
        ...buildCheckFallback(),
        ...parsed,
        skipped: false,
      });
    } catch (error) {
      console.error('AI advisory check failed:', error.message);
      return res.json(buildCheckFallback('AI check could not complete, so submission will continue without it.'));
    }
  } catch (error) {
    console.error('AI check route failed:', error.message);
    return res.status(500).json({ error: 'Failed to run AI advisory check.' });
  }
});

router.post('/preview-docs', requireAuth, async (req, res) => {
  try {
    const { body = '', postId } = req.body || {};
    const blocks = extractCodeBlocksFromHtml(body);
    const aiDocs = await generateDocsFromBlocks(blocks);

    // If a postId is provided (post already created), persist the docs so
    // opening the post later does not trigger a second generation run.
    if (postId) {
      try {
        const post = await Post.findById(postId);
        if (post && (!Array.isArray(post.aiDocs) || post.aiDocs.length === 0)) {
          post.aiDocs = aiDocs;
          post.aiDocsGeneratedAt = new Date();
          await post.save();
        }
      } catch (saveErr) {
        console.error('[AI Docs] Could not persist preview docs to post:', saveErr.message);
      }
    }

    return res.json({
      success: true,
      aiDocs,
    });
  } catch (error) {
    console.error('AI preview docs route failed:', error.message);
    return res.status(500).json({ error: 'Failed to generate preview AI docs.' });
  }
});

router.post('/auto-review/:postId', requireAuth, async (req, res) => {
  try {
    // eslint-disable-next-line no-underscore-dangle
    const userId = req.user._id;
    const {
      post,
      canAccess,
      isOwner,
    } = await loadReviewAccess(req.params.postId, userId);

    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (!canAccess || !isOwner) {
      return res.status(403).json({ error: 'Only the post author can trigger AI review.' });
    }

    post.aiReviewStatus = 'pending';
    await post.save();

    const prompt = buildAutoReviewPrompt(post);

    try {
      const raw = await callLLM(prompt, { maxTokens: 1400, timeoutMs: 15000 });
      const parsed = parseJsonResponse(raw, null);

      if (!parsed) {
        post.aiReview = buildAutoReviewFallback('AI review returned an unreadable response.');
        post.aiReviewStatus = 'failed';
      } else {
        post.aiReview = {
          ...buildAutoReviewFallback(),
          ...parsed,
          skipped: false,
        };
        post.aiReviewStatus = 'completed';
      }
    } catch (error) {
      console.error('AI auto-review failed:', error.message);
      post.aiReview = buildAutoReviewFallback('AI review is currently unavailable.');
      post.aiReviewStatus = 'failed';
    }

    post.aiReviewGeneratedAt = new Date();
    await post.save();

    return res.json({
      success: true,
      postId: post.id,
      aiReviewStatus: post.aiReviewStatus,
      aiReview: post.aiReview,
    });
  } catch (error) {
    console.error('AI auto-review route failed:', error.message);
    return res.status(500).json({ error: 'Failed to generate AI review.' });
  }
});

router.get('/review-result/:postId', requireAuth, async (req, res) => {
  try {
    // eslint-disable-next-line no-underscore-dangle
    const userId = req.user._id;
    const { post, canAccess } = await loadReviewAccess(req.params.postId, userId);

    if (!post) return res.status(404).json({ error: 'Post not found.' });
    if (!canAccess) return res.status(403).json({ error: 'You do not have access to this AI review.' });

    return res.json({
      success: true,
      aiReviewStatus: post.aiReviewStatus || null,
      aiReviewGeneratedAt: post.aiReviewGeneratedAt || null,
      aiReview: post.aiReview || null,
    });
  } catch (error) {
    console.error('AI review result route failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch AI review.' });
  }
});

router.post('/generate-docs/:postId', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const force = req.query.force === '1';

    if (post.aiDocs && !force) {
      return res.json({
        success: true,
        aiDocs: post.aiDocs,
        cached: true,
      });
    }

    const aiDocs = await generateDocsForPost(post);
    return res.json({
      success: true,
      aiDocs,
      cached: false,
    });
  } catch (error) {
    console.error('AI docs generation route failed:', error.message);
    return res.status(500).json({ error: 'Failed to generate AI docs.' });
  }
});

router.get('/docs/:postId', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    // Return cached docs if they have ever been set (even all-skipped).
    // Only generate fresh docs when aiDocs has never been populated.
    if (Array.isArray(post.aiDocs) && post.aiDocs.length >= 0) {
      return res.json({
        success: true,
        aiDocs: post.aiDocs,
        cached: true,
      });
    }

    const aiDocs = await generateDocsForPost(post);
    return res.json({
      success: true,
      aiDocs,
      cached: false,
    });
  } catch (error) {
    console.error('AI docs fetch route failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch AI docs.' });
  }
});

router.post('/docs/:postId/regenerate', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    // eslint-disable-next-line no-underscore-dangle
    const userId = req.user._id;
    if (String(post.createdBy || '') !== String(userId)) {
      return res.status(403).json({ error: 'Only the post author can regenerate AI docs.' });
    }

    post.aiDocs = null;
    post.aiDocsGeneratedAt = null;
    await post.save();

    const aiDocs = await generateDocsForPost(post);
    return res.json({
      success: true,
      aiDocs,
      regenerated: true,
    });
  } catch (error) {
    console.error('AI docs regenerate route failed:', error.message);
    return res.status(500).json({ error: 'Failed to regenerate AI docs.' });
  }
});

export default router;
