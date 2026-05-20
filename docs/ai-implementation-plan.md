# AI Feature Implementation Plan

## Goal

Implement the two AI features described in `docs/codex-prompt.md` in a way that fits the current Adobe Forum codebase rather than the prompt's assumed structure.

The two features are:

1. AI automated review after post submission
2. AI-generated code documentation for published posts

This plan adapts both features to the repo as it exists today:

- route mounting happens in `server/app.js`
- post statuses are `published`, `pending_review`, and `changes_requested`
- human reviews use the `Review` model with `reviewers[]` plus `overallStatus`
- there is no existing `server/routes/agent.js`
- there is no existing LLM client helper or SDK dependency yet

---

## Current-state constraints

### Backend

- `server/app.js` mounts all API routes
- `server/routes/posts.js` creates posts and supports likes, views, and edits
- `server/routes/reviews.js` owns the human review workflow
- `server/models/Post.js` does not yet store AI docs or AI review linkage
- `server/models/Review.js` is built for human reviewers and does not have a place for structured AI output
- `server/helpers/mailer.js` already provides a shared email transporter

### Frontend

- `blocks/create-post/create-post.js` already creates the post, adds it to the sidebar, and creates the human review request
- `blocks/forum-post/forum-post.js` already loads post data and human review data
- code tabs in `forum-post.js` are generated dynamically from `<pre>` blocks, not from a fixed tab component

### Infrastructure

- `package.json` does not include `@anthropic-ai/sdk`
- no `/api/agent/*` routes exist yet
- no AI environment variables are consumed yet

---

## Recommended architecture

### 1. Add a dedicated AI route module

Create `server/routes/agent.js` and mount it from `server/app.js` as:

```js
app.use('/api/agent', agentRoutes);
```

This keeps AI concerns separate from the existing posts and reviews routes.

### 2. Add a shared LLM helper

Create `server/utils/llm.js` to centralize:

- base URL
- API key
- model name
- timeout handling
- safe parsing helpers

Recommended exports:

- `callLLM(prompt, options = {})`
- `parseJsonResponse(text, fallback)`
- `withTimeout(promise, ms, onTimeoutValue)`

This follows the prompt's intent while keeping error handling reusable.

### 3. Extend `Post` instead of overloading `Review`

The current `Review` schema is optimized for human reviewers. Forcing AI output into `reviewers[]` would create awkward fake users and mixed semantics.

Recommended additions to `server/models/Post.js`:

```js
aiReviewId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Review',
  default: null,
},
aiReview: {
  type: mongoose.Schema.Types.Mixed,
  default: null,
},
aiReviewStatus: {
  type: String,
  enum: ['pending', 'completed', 'failed', 'skipped'],
  default: null,
},
aiReviewGeneratedAt: {
  type: Date,
  default: null,
},
aiDocs: {
  type: Array,
  default: null,
},
aiDocsGeneratedAt: {
  type: Date,
  default: null,
},
```

Why this shape:

- `aiReview` stores the structured review payload directly on the post for fast reads
- `aiReviewId` can optionally point to a companion review/audit record if we still want traceability
- `aiReviewStatus` makes the frontend resilient while background jobs are still running
- `aiDocs` is cached on the post exactly as the prompt expects

### 4. Keep human review flow unchanged

AI review should be additive, not a replacement. The existing `Review` flow in `server/routes/reviews.js` should remain the source of truth for human approvals and change requests.

Recommended behavior:

- human review request is still created on submit
- AI review runs in the background after post creation
- if AI strongly approves, it may auto-publish only if that business rule is explicitly desired
- otherwise, the post remains in `pending_review` and human reviewers see the AI findings as guidance

Because the repo already has a real reviewer workflow, auto-publishing should be treated as an optional second phase, not the first implementation milestone.

---

## Feature 1: AI automated review

### API design

Create these endpoints in `server/routes/agent.js`.

#### `POST /api/agent/check`

Purpose:

- lightweight advisory check from the create-post flow
- does not persist anything

Input:

```json
{
  "title": "string",
  "body": "string",
  "tags": ["string"],
  "category": "string"
}
```

Output:

```json
{
  "passed": true,
  "summary": "string",
  "codeIssues": [],
  "docIssues": [],
  "suggestedTags": [],
  "reviewerHint": "string",
  "skipped": false
}
```

Notes:

- `requireAuth`
- short timeout, around 8 seconds
- safe fallback if LLM is unavailable

#### `POST /api/agent/auto-review/:postId`

Purpose:

- deep structured review after a post is created
- persists AI review on the post

Input:

- no request body required
- post is loaded from MongoDB

Output:

```json
{
  "success": true,
  "postId": "string",
  "aiReviewStatus": "completed",
  "aiReview": {}
}
```

Stored review shape:

```json
{
  "overallScore": 8,
  "recommendation": "approve",
  "reasoning": "string",
  "codeReview": {
    "issues": [],
    "suggestions": [],
    "positives": []
  },
  "documentationReview": {
    "issues": [],
    "suggestions": [],
    "completenessScore": 7
  },
  "securityFlags": [],
  "checklist": [
    { "item": "string", "passed": true, "note": "string" }
  ]
}
```

Behavior:

- `requireAuth`
- only post owner should be allowed to trigger manually
- 15 second timeout
- save result to `Post.aiReview`
- set `Post.aiReviewStatus`
- set `Post.aiReviewGeneratedAt`

Recommended first-phase publishing behavior:

- if recommendation is `approve`, do not auto-publish yet
- keep post in `pending_review`
- let human reviewers see the AI result

Reason:

- this is lower risk
- it matches the current review-centric product design
- it avoids bypassing reviewer expectations before the AI output is validated in real usage

Optional second phase:

- add guarded auto-publish only when recommendation is `approve` and score exceeds a threshold such as `9`
- notify the author by email

#### `GET /api/agent/review-result/:postId`

Purpose:

- fetch cached AI review result for the post view

Output:

```json
{
  "success": true,
  "aiReviewStatus": "completed",
  "aiReview": {}
}
```

Access:

- `requireAuth`
- available to author and assigned reviewers

### Backend implementation steps

1. Add `server/utils/llm.js`
2. Add `server/routes/agent.js`
3. Extend `server/models/Post.js`
4. Mount route in `server/app.js`
5. Add optional email helper usage for future auto-approval notification

### Frontend implementation steps

#### `blocks/create-post/create-post.js`

Add two things:

1. Call `POST /api/agent/check` before preview or before final submission as an advisory step
2. After successful post creation, trigger:

```js
fetch(`${API_BASE}/agent/auto-review/${createdPost._id}`, {
  method: 'POST',
  credentials: 'include',
}).catch(() => {});
```

This call should remain fire-and-forget.

Also add UI copy near the review submission step:

- "A full AI review will run automatically after submission."

#### `blocks/forum-post/forum-post.js`

Add a new AI review panel above the existing human review panel.

Panel contents:

- overall score badge
- recommendation badge
- reasoning text
- expandable sections for code review, documentation review, security flags
- checklist rows with pass/fail indicators

Load logic:

- when post data loads, also fetch `/api/agent/review-result/:postId`
- show loading, empty, and failed states

Human override behavior:

- phase 1: UI only shows AI output as guidance
- phase 2: add explicit "Override AI decision" controls if business rules require it

This keeps the first implementation smaller and avoids mixing human review submission logic with AI-state mutation too early.

---

## Feature 2: AI code documentation generator

### API design

#### `POST /api/agent/generate-docs/:postId`

Purpose:

- extract code blocks from `post.body`
- generate docs for each block
- cache results on the post

Access:

- no auth required if published posts are public

Behavior:

- if `post.aiDocs` already exists, return cached result unless regeneration is explicitly requested
- parse `<pre>` blocks and language hints from existing HTML
- run LLM calls in parallel with `Promise.all`
- save to `Post.aiDocs`
- save `aiDocsGeneratedAt`

Stored shape:

```json
[
  {
    "blockIndex": 0,
    "language": "javascript",
    "code": "const x = 1;",
    "docs": {
      "summary": "string",
      "parameters": [],
      "returns": "string",
      "usage": "string",
      "dependencies": [],
      "notes": []
    }
  }
]
```

#### `GET /api/agent/docs/:postId`

Purpose:

- return cached docs
- lazily generate docs when not cached yet

Behavior:

- if `aiDocs` exists, return immediately
- if no docs exist, generate and return
- only allow generation for published posts by default

Optional future endpoint:

#### `POST /api/agent/docs/:postId/regenerate`

Purpose:

- author-only regeneration when they want fresher AI docs

This should be separate from `GET` so regeneration is explicit.

### Parsing strategy

The current editor stores code blocks as `<pre>` elements with `data-language` and sometimes language classes.

Recommended extraction logic:

- match all `<pre>` blocks from `post.body`
- derive language from:
  - `data-language`
  - `class="code-lang-*"`
  - fallback to `plaintext`
- strip HTML entities carefully before sending code to the LLM

If regex becomes fragile, add a lightweight HTML parser later. For phase 1, regex is acceptable because the editor output is controlled by our own frontend.

### Frontend implementation steps

#### `blocks/forum-post/forum-post.js`

The current code tab system groups snippets into language tabs. That is different from what the prompt assumes, so we should adapt the docs UX to the current renderer instead of forcing a full tab-system rewrite.

Recommended approach:

- keep existing code tab behavior intact
- for each code snippet panel, append a collapsible `AI Docs` section beneath the rendered code panel
- fetch docs once per post from `/api/agent/docs/:postId`
- map docs by `blockIndex`

Rendered doc content:

- summary
- parameters table when parameters exist
- returns
- usage as code text
- dependencies list
- notes list
- small "AI generated" label

Why this is better than a forced fourth tab:

- it minimizes risk to the custom code-tab implementation already in place
- it avoids a large DOM refactor inside `forum-post.js`
- it keeps each docs payload visually attached to its matching code block

Optional phase 2:

- refactor the code tab renderer into a reusable data-driven component and add a real `Docs` tab

---

## Suggested delivery phases

### Phase 1: foundation

- add LLM helper
- add AI route module
- add Post schema fields
- mount routes in `server/app.js`
- add advisory `/api/agent/check`

### Phase 2: AI review read/write path

- implement `/api/agent/auto-review/:postId`
- persist `aiReview`
- show AI review panel in `forum-post.js`
- trigger background auto-review from `create-post.js`

### Phase 3: AI docs generation

- implement code extraction and docs caching
- add `/api/agent/docs/:postId`
- render docs UI in `forum-post.js`

### Phase 4: optional product hardening

- controlled auto-publish rules
- author-only regenerate docs endpoint
- richer reviewer override workflow
- analytics and prompt tuning

---

## Risks and decisions to confirm

### 1. Auto-publish policy

Decision needed:

- should AI be allowed to publish automatically, or only advise human reviewers?

Recommendation:

- start with advisory-only AI

### 2. Where AI review data lives

Decision needed:

- store AI output on `Post`, `Review`, or both?

Recommendation:

- primary storage on `Post`
- optional pointer to a related audit record if needed later

### 3. Docs UI shape

Decision needed:

- force a new `Docs` tab into the current code viewer, or attach docs below each code panel?

Recommendation:

- attach docs below each code panel first

### 4. LLM provider dependency

Decision needed:

- install `@anthropic-ai/sdk` now, or build against generic `fetch` first?

Recommendation:

- use the SDK if the project is committed to Anthropic-compatible APIs
- otherwise use `fetch` in the helper to keep provider swapping simpler

---

## Minimal file change set

Backend:

- `server/app.js`
- `server/models/Post.js`
- `server/routes/agent.js`
- `server/utils/llm.js`

Frontend:

- `blocks/create-post/create-post.js`
- `blocks/forum-post/forum-post.js`

Possible later changes:

- `blocks/forum-post/forum-post.css`
- `package.json`

---

## Recommended first implementation target

If we want the fastest low-risk slice, build this first:

1. `server/utils/llm.js`
2. `server/routes/agent.js` with `POST /api/agent/check`
3. `server/models/Post.js` AI fields
4. `server/app.js` route registration
5. `blocks/create-post/create-post.js` advisory call and background auto-review trigger stub
6. `blocks/forum-post/forum-post.js` AI review panel read path

That gives us an end-to-end AI review skeleton without destabilizing the human workflow or rewriting the code-tab renderer too early.
