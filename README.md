<div align="center">
  <img src="./public/assets/images/logo.svg" alt="Linkora logo" width="92" />
  <h1>Linkora</h1>
  <p><strong>Share what matters. Discover what inspires.</strong></p>
  <p>A modern, AI-powered social platform for creators, communities, and meaningful connections.</p>

  <p>
    <a href="https://linkoraweb.vercel.app/"><strong>Open live demo</strong></a>
    &nbsp;&bull;&nbsp;
    <a href="https://github.com/DishantSaini55/Linkora-Web">View source</a>
    &nbsp;&bull;&nbsp;
    <a href="https://github.com/DishantSaini55/Linkora-Web/issues">Report an issue</a>
  </p>

  <p>
    <a href="https://github.com/DishantSaini55/Linkora-Web/actions/workflows/ci.yml">
      <img src="https://github.com/DishantSaini55/Linkora-Web/actions/workflows/ci.yml/badge.svg" alt="CI status" />
    </a>
    <a href="https://linkoraweb.vercel.app/">
      <img src="https://img.shields.io/badge/demo-live-7c3aed?style=flat-square" alt="Live demo" />
    </a>
    <img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=white" alt="React 18" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5" />
    <img src="https://img.shields.io/badge/Appwrite-backend-f02e65?style=flat-square&logo=appwrite&logoColor=white" alt="Appwrite" />
  </p>
</div>

> The live demo requires a configured Appwrite project. No server credentials
> are included in this repository.

## Why Linkora?

Linkora brings the core social experience into one focused product: a visual
feed for publishing, Stories for moments that expire, messaging for private
conversations, and built-in safety controls for healthier communities.

<table>
  <tr>
    <td width="50%"><strong>Publish beautifully</strong><br />Create image posts, manage drafts, add captions, and organize your profile.</td>
    <td width="50%"><strong>Connect naturally</strong><br />Follow creators, comment, save posts, message privately, and receive notifications.</td>
  </tr>
  <tr>
    <td><strong>Tell stories</strong><br />Share expiring image or video segments with overlays, privacy controls, views, and owned audio.</td>
    <td><strong>Build responsibly</strong><br />Use server-side authorization, moderation, reporting, blocking, and rate limiting.</td>
  </tr>
</table>

## Feature overview

| Social | Creator | Intelligence | Safety |
| --- | --- | --- | --- |
| Feed and discovery | Drafts and publishing | AI captions and hashtags | Ownership validation |
| Likes, comments, saves | Profiles and media | Gemini through Function | Reports and moderation |
| Follows and notifications | Stories and overlays | Server-side API keys | Blocking and muting |
| Private messaging | User-owned Story audio | Secure action routing | Rate limiting |

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State and forms | TanStack Query, React Hook Form, Zod |
| Backend platform | Appwrite Auth, Databases, Storage, Functions |
| Server runtime | Node.js 18+ |
| AI | Gemini API through the Appwrite Function |
| Quality | ESLint, TypeScript, Node test runner, GitHub Actions |
| Deployment | Vercel-compatible Vite build and Appwrite Function |

## Architecture

```text
React/Vite client
       |
       +--> Appwrite Auth, Tables, and Storage
       |
       +--> create-notification Function
               +--> authorization and ownership checks
               +--> moderation and rate limiting
               +--> reports, messaging, and notifications
               +--> Story publishing, privacy, views, and media validation
               +--> server-side Gemini requests
```

The single Appwrite Function in
[`functions/create-notification/`](./functions/create-notification/) exposes
secured actions for notifications, reports, moderation, messaging, AI
generation, and Stories. Sensitive API keys are never sent to the browser.

## Getting started

### Requirements

- Node.js 18 or newer
- npm
- An Appwrite project with a Web platform for the local/deployed hostname

### Install

```bash
git clone https://github.com/DishantSaini55/Linkora-Web.git
cd Linkora-Web
npm ci
```

Create local configuration from the template:

```powershell
Copy-Item .env.example .env.local
```

Populate `.env.local` with your Appwrite project identifiers. Vite exposes
`VITE_*` values to the browser, so **never put an API key or provider secret in
one of those variables**.

Start the development server:

```bash
npm run dev
```

The default local URL is `http://localhost:5173`.

## Appwrite setup

### Frontend variables

The client uses the public identifiers listed in [`.env.example`](./.env.example),
including:

```text
VITE_APPWRITE_URL
VITE_APPWRITE_PROJECT_ID
VITE_APPWRITE_DATABASE_ID
VITE_APPWRITE_STORAGE_ID
VITE_APPWRITE_USER_COLLECTION_ID
VITE_APPWRITE_POST_COLLECTION_ID
VITE_APPWRITE_SAVES_COLLECTION_ID
VITE_APPWRITE_FOLLOWS_COLLECTION_ID
VITE_APPWRITE_COMMENTS_COLLECTION_ID
VITE_APPWRITE_REPORTS_COLLECTION_ID
VITE_APPWRITE_STORIES_COLLECTION_ID
VITE_APPWRITE_STORY_SEGMENTS_COLLECTION_ID
VITE_APPWRITE_STORY_VIEWS_COLLECTION_ID
VITE_APPWRITE_STORIES_FUNCTION_ID
```

Optional features use the remaining collection/function variables in the
template. Restart Vite after changing environment variables.

### Core data model

Create the following Appwrite collections/tables:

- **Users** — profile data linked to an Appwrite account
- **Posts** — captions, media references, locations, tags, likes, and saves
- **Saves** — user-to-post saved records
- **Follows** — `follower` and `following` profile IDs
- **Comments** — post, author, and content
- **Reports** — private moderation reports
- **Notifications** — like, save, follow, and comment notifications
- **Messages** — sender, recipient, content, and read state
- **Stories** — owner, privacy, expiration, and status
- **StorySegments** — ordered media references, overlays, and music metadata
- **StoryViews** — Story, segment, viewer, and timestamp

Recommended indexes include:

```text
Users.accountId, Users.username
Follows.follower, Follows.following
Comments.post
Reports.reporter, Reports.targetId
Stories.owner, Stories.expiresAt
StorySegments.storyId, StorySegments.owner
StoryViews.storyId, StoryViews.viewerAccountId
```

Use authenticated-user read access for profile/feed data. Keep reports, drafts,
preferences, safety records, and view records private. The trusted Function
enforces Story privacy and ownership; do not grant clients unrestricted create,
update, or delete permissions for Story records.

### Storage

Linkora uses one Appwrite Storage bucket for profile media, post media, Story
media, and user-owned Story audio. Authenticated users need bucket-level Create
and Read access. Newly uploaded Story files receive authenticated-user read
permission plus owner update/delete permissions.

Supported limits:

- Post/profile images: 10 MB
- Story images/videos: 50 MB
- Story videos: 60 seconds
- Story audio: 20 MB
- Selected Story audio range: 60 seconds

### Deploy the Appwrite Function

The repository contains one deployable Function. Configure it from
[`functions/create-notification/README.md`](./functions/create-notification/README.md).

Build the current archive:

```powershell
tar -czf create-notification.tar.gz -C functions/create-notification package.json src
```

Upload [`create-notification.tar.gz`](./create-notification.tar.gz) to an
Appwrite Node.js Function with:

```text
Entrypoint: src/main.js
Runtime: Node.js 18+
Execution: authenticated users
```

The Function requires server-only variables such as:

```text
APPWRITE_ENDPOINT
APPWRITE_PROJECT_ID
APPWRITE_DATABASE_ID
APPWRITE_API_KEY
APPWRITE_STORAGE_ID
APPWRITE_USER_COLLECTION_ID
APPWRITE_STORIES_COLLECTION_ID
APPWRITE_STORY_SEGMENTS_COLLECTION_ID
APPWRITE_STORY_VIEWS_COLLECTION_ID
```

It also accepts the optional moderation, messaging, follows, reports, and AI
configuration documented in the Function README. The API key needs the minimum
database/document and `files.read` scopes required by the configured features.

## Validation

Run the frontend checks:

```bash
npm run lint
npm run build
```

Run the Function tests:

```bash
cd functions/create-notification
npm test
node --check src/main.js
```

GitHub Actions runs the frontend lint/build and Function checks on pushes and
pull requests. The current backend suite covers authorization, moderation,
messaging, reports, Stories, media ownership, overlays, follower privacy,
views, and user-owned audio.

## Deployment

### Vercel

1. Import the repository into Vercel.
2. Select the Vite framework preset.
3. Use `npm run build` as the build command.
4. Use `dist` as the output directory.
5. Add the public `VITE_*` variables in the Vercel project settings.
6. Add the deployed hostname as an Appwrite Web platform.

The repository’s [`vercel.json`](./vercel.json) includes the SPA rewrite needed
for client-side routes.

### Appwrite Sites

The same Vite command and `dist` output directory can be used with Appwrite
Sites. Configure the public environment variables in the Site settings and
register the Site hostname as an Appwrite Web platform.

## Repository structure

```text
src/
├── _auth/                 # Authentication routes and forms
├── _root/                 # Authenticated layouts and pages
├── components/            # Shared UI and feature components
├── context/               # Authentication state
├── hooks/                 # Reusable application hooks
├── lib/appwrite/          # Appwrite client and API operations
├── lib/react-query/       # Query hooks and cache keys
└── types/                 # Shared TypeScript contracts

functions/create-notification/
├── src/main.js            # Trusted multi-action Appwrite Function
└── test/                  # Node regression tests
```

## Security principles

- Keep `APPWRITE_API_KEY`, `GEMINI_API_KEY`, and `AI_API_KEY` server-side.
- Validate ownership and permissions in the Function, not only in the client.
- Keep reports, messages, views, drafts, and preferences appropriately private.
- Do not commit `.env.local` or deployment secrets.
- Rotate any secret that appears in logs, screenshots, commits, or public issues.

## Contributing

1. Create a focused branch from `main`.
2. Make a small, reviewable change.
3. Run `npm run lint`, `npm run build`, and relevant Function tests.
4. Update documentation for configuration or behavior changes.
5. Open a pull request with a clear summary and verification notes.

## License

This project is currently maintained as a private portfolio/application
repository. Contact the author before reusing or redistributing the code.

## Author

**Dishant Saini**

- GitHub: [@DishantSaini55](https://github.com/DishantSaini55)
- Project: [Linkora-Web](https://github.com/DishantSaini55/Linkora-Web)
