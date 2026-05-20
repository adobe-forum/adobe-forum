# CODEX PROMPT — Adobe Internal Developer Forum
# Two tasks: (1) AI-automated review system, (2) AI code documentation generator
# Paste this entire file as context to Codex before asking it to write code

---

## PROJECT CONTEXT

This is an internal Adobe developer forum built with:
- Frontend: Vanilla JS, CSS, modular "blocks" architecture (AEM-style)
- Backend: Node.js + Express, MongoDB + Mongoose, express-session for auth
- AI: Local LLM via LM Studio (Gemma 4 E4B) running an OpenAI/Anthropic-compatible
  API on http://localhost:1234 — OR — Anthropic Claude API (claude-haiku-4-5)
  Both are swappable via environment variable LLM_BASE_URL

## EXISTING FILE STRUCTURE

server/
  index.js               — Express app entry, route registration
  middleware/
    auth.js              — requireAuth middleware (checks session)
  routes/
    agent.js             — AI check route (already built, see below)
    posts.js             — CRUD for posts
    reviews.js           — Review workflow (needs AI automation added)
  models/
    Post.js              — Mongoose model: title, body, tags, category,
                           status (draft/pending/approved/rejected), author
    Review.js            — Mongoose model: post, reviewer, status, comments

blocks/
  create-post/
    create-post.js       — Multi-step post submission flow (6 steps)
    create-post.css
  forum-post/
    forum-post.js        — Single post view, code block tabs, reviewer UI
    forum-post.css
  cards-display/
    cards-display.js     — Post listing with sorting
    cards-display.css
  auth-form/
    auth-api.js          — fetch wrappers: login, register, getMe, logout
    auth-form.js
  sidebar/
    sidebar.js

## EXISTING AGENT ROUTE (server/routes/agent.js) — already built

  POST /api/agent/check
  - Input: { title, body, tags, category }
  - requireAuth middleware
  - Calls LLM with buildPrompt()
  - Returns: { passed, summary, codeIssues, docIssues,
               suggestedTags, reviewerHint, skipped, tokens }
  - 8 second timeout with graceful fallback
  - Uses Anthropic SDK pointed at LLM_BASE_URL

## ENVIRONMENT VARIABLES

  ANTHROPIC_API_KEY=sk-ant-...   (or 'lm-studio' for local)
  LLM_BASE_URL=http://localhost:1234  (LM Studio) or https://api.anthropic.com
  LLM_MODEL=google/gemma-4-e4b        (or claude-haiku-4-5)
  MONGODB_URI=...
  SESSION_SECRET=...
  PORT=5000

---

## TASK 1 — AI AUTOMATED REVIEW SYSTEM

### What it should do

When a post is submitted for review, instead of (or before) assigning a human
reviewer, an AI agent does a first-pass automated review. The AI review:

1. Reads the full post (title, body, tags, category)
2. Runs a detailed technical review — not just a check, a full structured critique
3. Produces a structured review object saved to MongoDB
4. If the post clearly passes all checks → auto-approves it and notifies the author
5. If issues are found → flags it for human review and pre-fills the reviewer's
   checklist with the AI findings so the human reviewer starts from a better baseline
6. The human reviewer can see the AI review alongside their own review panel
   and can accept, modify, or override any AI finding

### Detailed requirements

**Backend — new route: POST /api/agent/auto-review/:postId**
- requireAuth (must be called by the post author or system)
- Fetch the post from MongoDB by postId
- Run a deep review prompt (more detailed than the /check prompt)
- The prompt should return JSON with this exact shape:
  {
    "overallScore": number (1-10),
    "recommendation": "approve" | "needs_revision" | "reject",
    "reasoning": "string — 2-3 sentences explaining the recommendation",
    "codeReview": {
      "issues": ["string"],
      "suggestions": ["string"],
      "positives": ["string"]
    },
    "documentationReview": {
      "issues": ["string"],
      "suggestions": ["string"],
      "completenessScore": number (1-10)
    },
    "securityFlags": ["string — any security concerns found"],
    "checklist": [
      { "item": "string", "passed": boolean, "note": "string" }
    ]
  }
- Save this result to the Review model as a new review with
  reviewer: 'ai-agent', status: recommendation, aiReview: result
- If recommendation === 'approve': update Post.status to 'approved'
  and send notification email to author (use existing nodemailer setup)
- If recommendation !== 'approve': update Post.status to 'pending'
  and keep the human review workflow active

**Backend — GET /api/agent/review-result/:postId**
- Returns the saved AI review for a post
- Used by forum-post.js to show the AI review panel to human reviewers

**Frontend — forum-post.js changes**
- In the reviewer view, add an "AI Review" panel that shows:
  - Overall score badge (color coded: green ≥8, amber 5-7, red <5)
  - Recommendation badge (approve / needs revision / reject)
  - Expandable sections for: Code Review, Documentation Review, Security Flags
  - The checklist items with pass/fail indicators
  - A "Override AI decision" button for human reviewers to change the outcome
- This panel appears above the existing human review comment box
- Load the AI review via GET /api/agent/review-result/:postId on page load

**Frontend — create-post.js changes**
- After the existing /api/agent/check step (the pre-submission advisory check),
  add a note: "A full AI review will run automatically after submission"
- After POST /api/posts succeeds, fire POST /api/agent/auto-review/:postId
  in the background (don't await it — don't block the UX)

### Style guidelines
- Match existing CSS variable naming in forum-post.css
- Use the same dialog/panel patterns already in forum-post.js
- The AI review panel should be visually distinct from the human review panel
  but use the same component structure

---

## TASK 2 — AI CODE DOCUMENTATION GENERATOR

### What it should do

When a post contains code blocks, the AI automatically generates structured
documentation for each code block and appends it below the code in the post view.
This is triggered once when the post is first viewed after publishing, cached in
MongoDB, and shown to all subsequent viewers.

### Detailed requirements

**Backend — POST /api/agent/generate-docs/:postId**
- requireAuth not required (docs are public)
- Rate limit: only run if post.aiDocs is null (don't regenerate)
- Extract all code blocks from post.body HTML
  (look for <pre><code class="language-*"> elements — parse with regex or
  a lightweight HTML parser)
- For each code block, call the LLM with a documentation prompt:
  Input: { language, code }
  Output JSON:
  {
    "summary": "string — one sentence what this code does",
    "parameters": [{ "name": "string", "type": "string", "description": "string" }],
    "returns": "string — what it returns or produces",
    "usage": "string — example of how to use it",
    "dependencies": ["string — any imports or prerequisites"],
    "notes": ["string — edge cases, gotchas, performance notes"]
  }
- Run all code block docs in parallel (Promise.all)
- Save result to Post model as aiDocs: [{ blockIndex, language, code, docs }]
- Return the full aiDocs array

**Backend — GET /api/agent/docs/:postId**
- Returns post.aiDocs if it exists
- If null, triggers POST /api/agent/generate-docs/:postId and returns result
- Add aiDocs: { type: Array, default: null } to Post.js Mongoose model

**Frontend — forum-post.js changes**
- After the existing code block tab rendering (the tabbed code viewer), add a
  fourth tab: "Docs" alongside the existing Code / Output / Preview tabs
- The Docs tab content is fetched from GET /api/agent/docs/:postId on first load
- Show a loading spinner in the Docs tab while fetching
- Render the docs as:
  - Summary at the top (bold)
  - Parameters table (name | type | description)
  - Returns, Usage (as a code snippet), Dependencies (as a list), Notes (as a list)
- If a code block has no parameters (e.g. a CSS snippet), hide the parameters table
- Add a small "AI generated" label at the bottom of each docs tab
- Add a "Regenerate docs" button visible only to the post author (check against
  window.__currentUser which auth-form.js sets on login)

### Style guidelines
- The Docs tab should use the same tab styling as the existing Code tab
- Parameters table: use existing table styles if any, otherwise simple bordered table
- Match the --color-* CSS variables used throughout forum-post.css

---

## CODING INSTRUCTIONS FOR CODEX

1. Follow the existing code patterns — look at how other routes are structured
   in server/routes/ and mirror that style exactly
2. Use ES modules (import/export) throughout — the project uses "type":"module"
3. All LLM calls must go through a single helper function so the model and
   baseURL can be swapped via env vars without touching call sites:

   // server/utils/llm.js — create this file
   import Anthropic from '@anthropic-ai/sdk';
   const client = new Anthropic({
     baseURL: process.env.LLM_BASE_URL || 'https://api.anthropic.com',
     apiKey: process.env.ANTHROPIC_API_KEY,
   });
   export async function callLLM(prompt, maxTokens = 1000) {
     const msg = await client.messages.create({
       model: process.env.LLM_MODEL || 'claude-haiku-4-5',
       max_tokens: maxTokens,
       messages: [{ role: 'user', content: prompt }],
     });
     return msg.content[0].text;
   }

4. All LLM responses must be parsed safely:
   const raw = response.replace(/```json|```/g, '').trim();
   const result = JSON.parse(raw);
   Wrap in try/catch — if JSON.parse fails, log and return a safe fallback

5. Never block the post submission UX — all post-submit AI calls must be
   fire-and-forget (no await at the route level after the post is created)

6. Add a timeout of 15 seconds to all auto-review LLM calls (longer than the
   pre-submission check since it does more work)

7. Register all new routes in server/index.js alongside existing routes

8. Add these fields to Post.js Mongoose model if not already present:
   aiReviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' }
   aiDocs: { type: Array, default: null }

9. Do not modify the existing review workflow — the AI review is additive,
   it runs alongside the human review, not instead of it (unless auto-approved)

10. Output one file at a time, in this order:
    1. server/utils/llm.js
    2. server/routes/agent.js (updated with new endpoints)
    3. server/models/Post.js (updated with new fields)
    4. blocks/forum-post/forum-post.js (updated with AI review panel + docs tab)
    5. blocks/create-post/create-post.js (updated with background auto-review trigger)
    6. server/index.js (updated route registration only)
