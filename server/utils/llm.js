/* eslint-disable no-console */
const DEFAULT_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 300000;

function stripCodeFences(text = '') {
  return text.replace(/```json/gi, '').replace(/```/g, '').trim();
}

/**
 * Finds the first '{' or '[' in the text, then tries JSON.parse on
 * progressively shorter substrings (walking the closing char backwards)
 * until one succeeds. Handles two Gemma quirks automatically:
 *  1. Reasoning prose before the JSON  ("...Score: 5/5{...}")
 *  2. Duplicate JSON blocks back-to-back ("{...}{...}")
 */
function parseFirstJsonBlock(text) {
  const startBrace = text.indexOf('{');
  const startBracket = text.indexOf('[');
  let start = -1;
  if (startBrace === -1) start = startBracket;
  else if (startBracket === -1) start = startBrace;
  else start = Math.min(startBrace, startBracket);
  if (start === -1) return null;

  const closeChar = text[start] === '{' ? '}' : ']';
  let end = text.lastIndexOf(closeChar);

  while (end >= start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch (_) {
      end = text.lastIndexOf(closeChar, end - 1);
    }
  }
  return null;
}

export function parseJsonResponse(text, fallback = null) {
  const stripped = stripCodeFences(text);

  // Fast path: model output clean JSON
  try { return JSON.parse(stripped); } catch (_) { /* fall through */ }

  // Slow path: extract first valid JSON block from mixed output
  const parsed = parseFirstJsonBlock(stripped);
  if (parsed) return parsed;

  console.error('[AI Docs] Failed to parse LLM response. Raw (first 400 chars):', stripped.slice(0, 400));
  return fallback;
}

export async function callLLM(prompt, options = {}) {
  const {
    maxTokens = 1000,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    system = '',
  } = options;

  const baseUrl = (process.env.LLM_BASE_URL || 'http://localhost:1234').replace(/\/+$/, '');
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.LLM_API_KEY || 'lm-studio';
  const model = process.env.LLM_MODEL || 'google/gemma-4-e4b';

  const body = {
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };

  if (system) body.system = system;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = (Array.isArray(data?.content) ? data.content : [])
      .filter((item) => item?.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text)
      .join('\n')
      .trim();

    if (!text) throw new Error('Empty response from LLM');

    return text;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('LLM request timed out');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
