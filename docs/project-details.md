# Adobe Forum Project Guide

## What this project is

Adobe Forum is an internal forum-style web app built for sharing knowledge inside Adobe. People can:

- sign up with an Adobe email
- log in and stay signed in with a server session
- create posts with a rich text editor
- place posts inside categories and folders
- ask other users to review a post before it becomes public
- approve or request changes during review
- browse published posts from cards, search, and the sidebar
- like posts and track views
- manage profile details and password changes

In short, this project is not only a normal forum. It is a forum plus a review workflow plus a category tree.

---

## Main idea of the architecture

The project has two big parts:

### 1. Frontend

The frontend is the part users open in the browser. It is built in the Adobe Edge Delivery Services style, where pages are made from blocks. Each block usually has:

- one JavaScript file for behavior
- one CSS file for styling

The frontend uses:

- browser-native ES modules
- Preact for UI components
- `htm` instead of JSX
- vanilla CSS

There is no heavy build system for the frontend UI logic.

### 2. Backend

The backend is a Node.js + Express server. It handles:

- login and registration
- sessions
- password reset emails
- post creation and editing
- review requests
- sidebar/category data
- users list for reviewer picking
- MongoDB data storage

The backend lives in the `server/` folder.

---

## High-level app flow

### When a user opens the site

1. `head.html` loads `scripts/aem.js`, `scripts/scripts.js`, and the main stylesheet.
2. `scripts/scripts.js` decorates the page, loads blocks, starts the router, and loads the header and footer.
3. The page blocks such as `sidebar`, `cards-display`, `forum-post`, and `search-bar` render themselves.

### When a user creates a post

1. The user writes the title, body, tags, and chooses a category or folder.
2. The draft is saved in `sessionStorage` so refresh does not lose work.
3. The user previews the post.
4. The user accepts the confidentiality step.
5. The user picks reviewers.
6. The frontend sends requests to:
   - create the post
   - add the post into the sidebar tree
   - create a review request
7. The app refreshes the sidebar and cards list.

### When a reviewer reviews

1. The reviewer sees pending items in the sidebar.
2. The reviewer opens the post.
3. The reviewer approves or asks for changes.
4. The backend updates the review record and the post status.
5. If all reviewers approve, the post becomes `published`.
6. If any reviewer asks for changes, the post becomes `changes_requested`.

---

## Folder-by-folder explanation

## Root files

### `head.html`

Defines the page head used by the site. It sets:

- content security policy
- title and description
- viewport
- main scripts
- main stylesheet

### `post.html`

This is the main page layout for the forum experience. It includes:

- `header`
- `search-bar`
- `cards-display`
- `forum-post`
- `footer`

The cards view and single post view both live in this page, and the client router switches between them.

### `404.html`

Custom not-found page. It shows a 404 message, loads the standard site shell, and adds a back button when possible.

### `package.json`

Defines project metadata, scripts, and dependencies.

Main scripts:

- `npm run lint`
- `npm run lint:js`
- `npm run lint:css`
- `npm start`

Important dependencies:

- `express`
- `mongoose`
- `express-session`
- `connect-mongo`
- `bcryptjs`
- `nodemailer`
- `preact`

### `package-lock.json`

Locks the exact dependency versions used in this project so installs stay consistent.

### `README.md`

Still looks close to the Adobe boilerplate starter. It explains generic setup, not the full forum app.

### `implementation_plan.md`

Contains planning notes and design thinking for app behavior and storage decisions.

### `checks.htm`, `lint-output.txt`

Support and check artifacts used during development.

### `.editorconfig`, `.eslintrc.cjs`, `.stylelintrc.json`, `.eslintignore`, `.gitignore`, `.hlxignore`

These files control formatting, linting, and repo behavior.

### `.github/`

This folder is used for GitHub-side project support such as workflows, automation, or repo settings.

---

## `blocks/`

This is the main frontend feature folder. Each block is a self-contained UI module.

### `blocks/header/`

Controls the top bar of the app.

What it does:

- opens and closes the sidebar
- shows user menu
- shows profile popup
- allows profile editing
- allows password changing
- shows notifications
- handles logout
- watches session age and warns about expiry

Important behavior:

- reads the logged-in user from `localStorage`
- checks `/api/auth/me` to keep client state in sync with the real session
- dispatches UI events like `toggle-sidebar`

Files:

- `header.js`: all header logic
- `header.css`: header styles

### `blocks/sidebar/`

Controls the left navigation tree.

What it does:

- loads categories and nested items
- shows folders and post links
- supports expand and collapse
- supports search inside the tree
- shows pending reviews
- shows the current user’s review requests
- lets owners delete categories or items
- routes the user to a post

Important behavior:

- fetches from `/api/sidebar/categories`
- fetches from `/api/reviews/pending`
- fetches from `/api/reviews/my-requests`
- listens for refresh events from other blocks

Files:

- `sidebar.js`: sidebar logic
- `sidebar.css`: sidebar styles
- `SIDEBAR_DOCUMENTATION.md`: a dedicated sidebar explainer

### `blocks/cards-display/`

Shows the post list as cards on the homepage.

What it does:

- fetches posts from the backend
- supports paging
- supports sorting
- supports category filtering
- supports search filtering
- supports “my posts”
- hides itself when a single post is opened

The card UI also extracts:

- first image from the post body
- a short excerpt from HTML content
- author initials
- like and view counts

Files:

- `cards-display.js`
- `cards-display.css`

### `blocks/forum-post/`

Shows a single full post.

What it does:

- loads a post by id
- renders the post content
- supports liking
- updates views
- shows review status
- lets the owner jump to edit mode
- lets reviewers approve or request changes
- loads review details for the current post

Special behavior:

- converts code blocks into a tabbed code viewer
- uses `localStorage` to pass edit data to the edit page

Files:

- `forum-post.js`
- `forum-post.css`

### `blocks/create-post/`

This is one of the biggest blocks. It handles creating a new post.

What it includes:

- title input
- category and folder selection
- rich text editor
- tags input
- inline preview
- confidentiality dialog
- reviewer picker dialog
- draft recovery

Important flow:

- save draft in `sessionStorage`
- choose folder through the folder block
- submit post to `/api/posts`
- add sidebar item through `/api/sidebar-items/smart-add`
- create review request through `/api/reviews`

Files:

- `create-post.js`
- `create-post.css`

### `blocks/edit-post/`

Very similar to create-post, but for updating an existing post.

What it does:

- loads saved edit data from `localStorage`
- fills the form with old post data
- edits title, body, tags, category, and folder
- renames or moves the related sidebar item when needed
- refreshes sidebar and cards after save

If a post was in `changes_requested` state, editing can send it back into review.

Files:

- `edit-post.js`
- `edit-post.css`

### `blocks/folder/`

Provides the folder and category picker UI.

What it does:

- opens as a modal
- shows tree navigation
- allows searching
- allows selecting a folder
- allows adding categories and folders
- allows renaming
- allows deleting

This block is used by create-post and edit-post.

Files:

- `folder.js`
- `folder.css`

### `blocks/auth-form/`

Handles user authentication screens.

What it includes:

- login
- sign up
- forgot password

Important behavior:

- only allows Adobe company email domains
- stores safe user data in `localStorage` after login
- calls backend auth endpoints through `auth-api.js`

Files:

- `auth-form.js`
- `auth-form.css`
- `auth-api.js`

### `blocks/reset-password/`

Handles the reset-password page after the user clicks the email link.

What it does:

- reads token from the URL
- validates new password
- sends the new password to the backend

Files:

- `reset-password.js`
- `reset-password.css`

### `blocks/search-bar/`

Simple search block that broadcasts a search event for posts.

Files:

- `search-bar.js`
- `search-bar.css`

### `blocks/footer/`

Loads and renders the footer block.

Files:

- `footer.js`
- `footer.css`

### `blocks/fragment/`

Loads reusable content fragments from `.plain.html` content.

Files:

- `fragment.js`
- `fragment.css`

---

## `scripts/`

This folder contains shared frontend logic.

### `scripts/scripts.js`

This is the main page bootstrap file.

It:

- decorates the page
- loads blocks
- lazy-loads sections
- starts the client router
- loads fonts
- loads header and footer
- auto-loads fragments

### `scripts/aem.js`

This is the main Adobe EDS helper file.

It provides utilities for:

- decorating blocks
- decorating sections
- loading block CSS and JS
- loading header and footer
- icon decoration
- metadata reading
- responsive CSS ordering
- performance helpers

This file is the base infrastructure that makes the block system work.

### `scripts/router.js`

Controls client-side routing for the homepage and post detail view.

Main idea:

- homepage route: `/`
- post route: `/?post=<id>`

It:

- reads the current URL
- updates browser history
- broadcasts route changes
- supports old navigation signals like `af_open_post`

### `scripts/auth-state.js`

Small helper that clears client-side auth data.

### `scripts/code-tabs.js`

Helper related to tabbed code rendering.

### `scripts/utils/constants.js`

Shared constants for:

- API base URLs
- auth API URL
- breakpoints
- z-index layers
- spacing values

### `scripts/utils/colors.js`

Central place for shared color tokens used in JS-rendered UI.

### `scripts/utils/icons.js`

Central place for shared SVG icon components.

---

## `server/`

This is the backend application.

### `server/index.js`

The backend entry point.

It:

- loads environment variables
- connects to MongoDB
- starts Express on port `5000` by default

### `server/app.js`

Creates the Express app and wires the backend together.

It sets up:

- CORS
- JSON body parsing
- session middleware
- MongoDB session store
- route mounting

Mounted route groups:

- `/api/auth`
- `/api/posts`
- `/api`
- `/api/reviews`
- `/api/users`

### `server/routes/auth.js`

Handles authentication and account actions.

Endpoints include:

- register
- login
- logout
- get current user
- forgot password
- reset password
- update profile
- change password

Important rules:

- only Adobe email domains can register
- passwords are not stored in plain text
- sessions are saved before login responses are returned

### `server/routes/posts.js`

Handles post data.

What it supports:

- create a post
- list posts
- search posts
- filter by category
- filter by author
- fetch one post
- like or unlike a post
- track unique views for logged-in users
- mark notifications as read
- edit a post

Sorting supported:

- latest
- oldest
- most viewed
- most liked

### `server/routes/reviews.js`

Handles the review workflow.

What it supports:

- create a review request
- get pending reviews for a reviewer
- get author-side notifications
- dismiss review notifications
- get review data for one post
- get all requests by the current author
- submit review decisions
- reset all reviewers to pending when the author resubmits

### `server/routes/sidebar.js`

Handles sidebar categories and items.

What it supports:

- create category
- fetch full category tree
- delete category
- create sidebar item
- smart-add a post into the right place
- rename an item
- move an item
- delete an item and its descendants
- find a sidebar item by post id

This route is important because the forum is not only flat posts. It also has a nested folder structure.

### `server/routes/users.js`

Returns users for the reviewer picker. It excludes the current logged-in user.

### `server/models/`

Defines MongoDB schemas.

#### `User.js`

Stores:

- first name
- last name
- email
- hashed password
- reset token and expiry
- login time
- notifications

#### `Post.js`

Stores:

- title
- category
- body HTML
- tags
- views
- likes
- viewedBy
- status
- creator
- timestamps

Status values:

- `published`
- `pending_review`
- `changes_requested`

#### `Review.js`

Stores:

- post id
- author id
- reviewer list
- each reviewer’s status and comment
- overall review status
- whether the author has seen the result

#### `SidebarItem.js`

Stores:

- title
- category
- linked post id
- creator
- whether it is a folder
- parent id
- path
- related tags
- sort order

This model is what makes the sidebar tree possible.

### `server/middleware/auth.js`

Protects logged-in routes.

It:

- checks session user id
- loads the real user from MongoDB
- puts the user on `req.user`
- returns `401` when not authenticated

### `server/helpers/`

Shared backend helpers.

#### `buildTree.js`

Turns a flat sidebar item list into a nested tree.

#### `mailer.js`

Creates the reusable Nodemailer transporter for reset emails.

#### `escapeRegex.js`

Helps make search safer by escaping special regex characters.

#### `publishedFilter.js`

Defines the shared MongoDB filter for showing only published posts, while still allowing old legacy posts without a status field.

### `server/test-api.js`, `server/test-users.js`

Utility scripts related to local testing and checking backend behavior.

---

## `styles/`

This folder contains shared site-wide CSS.

### `styles/styles.css`

Main global stylesheet.

It defines:

- global page layout
- design tokens
- shared colors
- spacing variables
- page gutters
- common typography and structure

### `styles/responsive.css`

Central responsive rules for mobile, tablet, and desktop behavior.

Main breakpoints used by the project:

- `480px`
- `768px`
- `1024px`

### `styles/fonts.css`

Loads local fonts used by the project.

### `styles/lazy-styles.css`

Extra styles loaded later after the main page becomes visible.

---

## `fonts/`

Contains local font files such as Roboto variants used by the UI.

---

## `icons/`

Contains SVG and image assets used by the editor and interface.

Examples:

- formatting icons like bold, italic, code, quote, list, and table
- app branding icons
- profile images
- search and navigation icons

---

## `vendor/`

Contains pinned browser-ready library files used directly by the frontend:

- `preact.js`
- `preact-hooks.js`
- `htm.js`
- `htm-preact.js`

These files allow the project to run without a bundle step.

---

## `node_modules/`

This is the installed dependency folder created by npm. It is needed to run the project locally, but it is not where the app’s own business logic lives.

---

## `docs/`

This folder stores project documentation.

Existing files already cover different parts:

- `architecture.md`: architecture and data flow notes
- `decisions.md`: design and implementation decisions over time
- `project.md`: shorter project overview
- `tasks.md`: task tracking
- `weekly-progress.md`: weekly progress notes
- `vishnu-contributions.md`: contribution notes

This file is the full plain-language guide for the whole repo.

---

## Authentication system

This project uses session-based authentication.

That means:

- the backend keeps the real session
- the browser gets a session cookie
- frontend code cannot read the cookie directly
- protected API calls use `credentials: 'include'`

The frontend also keeps a small safe user object in `localStorage` under `af_user` so UI blocks can quickly know who is logged in.

This local copy is only a convenience cache. The backend session is the real source of truth.

---

## Review workflow

This is one of the most important business features in the project.

### Post statuses

- `published`: visible to normal browsing
- `pending_review`: waiting for reviewers
- `changes_requested`: reviewer asked the author to update it

### Review statuses

Each reviewer can mark their part as:

- `pending`
- `approved`
- `changes_requested`

### Review logic

- the author creates a post and assigns reviewers
- the backend creates a `Review` document
- reviewers see pending items
- if all reviewers approve, the post is published
- if one reviewer asks for changes, the post is moved to changes requested
- if the author edits and resubmits, review statuses can be reset to pending

---

## Sidebar and category system

The sidebar is a major part of the project design.

Instead of only storing a category name on a post, the app also stores sidebar tree items in MongoDB.

This gives the app:

- root categories
- nested folders
- post links inside folders
- ownership rules for categories and items
- moving and renaming support
- delete protection when another user owns a nested item

So the sidebar is not just a visual menu. It is its own data structure.

---

## Storage used in the browser

The frontend uses browser storage for a few helpful tasks.

### `localStorage`

Used for:

- `af_user`: cached logged-in user info
- `edit-post-draft`: data passed from the post view to the edit page

### `sessionStorage`

Used for:

- `create-post-draft`: create form draft recovery
- `af_open_post`: open a post after a cross-page navigation
- `fonts-loaded`: font-loading optimization

This storage is mainly used for UI convenience, not as the main data source.

---

## Events used between blocks

Because blocks are separate modules, they communicate through custom browser events.

Common events include:

- `refresh-sidebar`
- `refresh-cards`
- `forum-auth-changed`
- `toggle-sidebar`
- `sidebar-state-changed`
- `load-forum-post`
- `show-cards`
- `folder:open`
- `folder:selected`

This event system is how one block tells another block to refresh or react.

---

## Search and routing

### Routing

The router keeps the forum as a lightweight single-page experience on the homepage.

Main URL patterns:

- `/` for the cards view
- `/?post=<id>` for a single post view

### Search

Search exists in two places:

- card/search-bar search for posts
- sidebar search for category tree items

The backend post listing route also supports text search across:

- title
- category
- tags
- body
- author name

---

## Notifications

There are two notification areas in the project:

### 1. Review notifications

These tell authors when:

- all reviewers approved
- someone requested changes

### 2. Post like notifications

These tell a post author when another user liked their post.

These notifications are shown through the header UI and backed by the `notifications` field on the `User` model.

---

## Styling approach

The project styling follows a simple layered structure:

- global tokens and layout in `styles/styles.css`
- shared responsive rules in `styles/responsive.css`
- one CSS file per block for local styles

The design language uses Adobe Spectrum-style tokens plus custom app colors.

This keeps:

- global consistency
- block-level isolation
- responsive behavior in one clear place

---

## Development setup

For local work, the project usually runs with:

- frontend through AEM/Helix local tooling on `http://localhost:3000`
- backend Express API on `http://localhost:5000`
- MongoDB through `MONGODB_URI`

Important environment values used by the backend:

- `MONGODB_URI`
- `PORT`
- `SESSION_SECRET`
- `CLIENT_ORIGIN`
- `NODE_ENV`
- `GMAIL_USER`
- `GMAIL_PASS`

---

## What makes this project special

This project is more complex than a simple forum because it combines several systems:

1. Adobe EDS block-based frontend architecture
2. session-based authentication
3. rich post authoring with code, tables, and formatting
4. nested category and folder management
5. structured peer review workflow
6. card browsing plus single-post routing
7. profile and notification features

That mix is the real identity of the codebase.

---

## Short summary

If someone new joins the project, the easiest way to understand it is this:

- `blocks/` is the user interface
- `scripts/` is the shared frontend engine
- `server/` is the API and database layer
- `styles/` is the shared visual system
- `docs/` explains architecture and decisions
- `icons/`, `fonts/`, and `vendor/` support the UI

The main product flow is:

- user logs in
- user creates a post
- user places it in the sidebar structure
- user sends it for review
- reviewers approve or request changes
- approved posts become visible to everyone in the forum