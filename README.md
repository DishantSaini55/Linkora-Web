# Linkora

Linkora is a responsive social-media web application for sharing image posts, discovering creators, and saving content to revisit later. It pairs a React client with Appwrite authentication, database, and storage services.

## Overview

Linkora gives users a single place to create visual posts, browse recent content, interact with posts, manage their profile, and maintain a personal saved-post collection. The application is designed as a client-rendered web experience with responsive navigation for desktop and mobile layouts.

## Features

- Email-and-password account creation and sign-in
- Persistent Appwrite sessions and user-profile recovery
- Create, edit, and delete image posts
- Image validation for PNG, JPEG, and WebP uploads up to 10 MB
- Home feed and creator discovery
- Post likes and saved posts
- Follow relationships and follow notifications
- Commenting with comment notifications
- Unread notification badges
- Private post and comment reports
- Search and recent-post filtering
- User profiles and profile editing
- Responsive navigation with desktop and mobile layouts

## Tech Stack

- [React](https://react.dev/) 18
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com/) and [Zod](https://zod.dev/)
- [Appwrite](https://appwrite.io/) for authentication, data, and media storage

## Architecture

The React single-page application runs entirely in the browser. TanStack Query manages cached server data and mutations. The Appwrite Web SDK provides three backend services:

- **Account** for email/password accounts and sessions
- **Databases** for user profiles, posts, and saved-post records
- **Storage** for uploaded post and profile images

The project uses Appwrite's legacy `Databases` client methods. They remain compatible with the current TablesDB terminology in the Appwrite Console, where collections/documents are displayed as tables/rows.

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- An Appwrite project with web-platform access configured for your local or deployed URL

### Installation

```bash
git clone https://github.com/DishantSaini55/Linkora-Web.git
cd Linkora-Web
npm ci
```

### Environment Variables

Copy the provided template before running the application:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Populate `.env.local` with the public identifiers from your Appwrite project. Never add server API keys, service-role keys, or other secrets to a `VITE_` variable because Vite exposes those values to the browser.

| Variable | Description |
| --- | --- |
| `VITE_APPWRITE_URL` | Appwrite endpoint, including `/v1` |
| `VITE_APPWRITE_PROJECT_ID` | Appwrite project ID |
| `VITE_APPWRITE_DATABASE_ID` | Linkora database ID |
| `VITE_APPWRITE_STORAGE_ID` | Media storage-bucket ID |
| `VITE_APPWRITE_USER_COLLECTION_ID` | Users table ID |
| `VITE_APPWRITE_POST_COLLECTION_ID` | Posts table ID |
| `VITE_APPWRITE_SAVES_COLLECTION_ID` | Saves table ID |
| `VITE_APPWRITE_NOTIFICATION_COLLECTION_ID` | Notifications table ID |
| `VITE_APPWRITE_NOTIFICATION_FUNCTION_ID` | Appwrite Function ID used to create private notifications |
| `VITE_APPWRITE_FOLLOWS_COLLECTION_ID` | Follows table ID |
| `VITE_APPWRITE_COMMENTS_COLLECTION_ID` | Comments table ID |
| `VITE_APPWRITE_REPORTS_COLLECTION_ID` | Private Reports table ID |
| `VITE_APPWRITE_SAFETY_COLLECTION_ID` | Block/mute relationships table ID |
| `VITE_APPWRITE_DRAFTS_COLLECTION_ID` | Cloud post drafts table ID |
| `VITE_APPWRITE_PREFERENCES_COLLECTION_ID` | Optional cross-device notification preferences table ID |
| `VITE_APPWRITE_MESSAGES_COLLECTION_ID` | Optional private Messages table ID |
| `VITE_APPWRITE_PRESENCE_COLLECTION_ID` | Optional Presence table ID for cross-device online and typing status |
| `VITE_APPWRITE_INTERACTION_EVENTS_COLLECTION_ID` | Optional InteractionEvents table ID for feed analytics and personalization |

The Messages table should include `senderAccountId` (string), `attachmentId`
(optional string), and `attachmentUrl` (optional string). The Function also
needs `APPWRITE_USER_COLLECTION_ID` so older messages can be edited or deleted
after authorization is verified against the sender's profile.

Create a Presence table with document ID equal to the profile ID and these
attributes: `online` (boolean), `typingTo` (optional string), and `updatedAt`
(string). Allow authenticated users to read Presence documents. The owning
user must be allowed to update and delete their own document. Add the table ID
to `.env.local`, then restart Vite.
| `VITE_APPWRITE_MESSAGE_FUNCTION_ID` | Optional Function ID used to create private messages; defaults to the notification Function ID |

The Users collection should also include these optional attributes:

- `imageId` (string): the Storage file ID for the current profile picture.
- `nameChangedAt` (datetime): set automatically when the display name changes.
- `usernameChangedAt` (datetime): set automatically when the username changes.

Create a **Key** index on `username` so profile updates can reject duplicate
usernames reliably. Usernames may contain letters, numbers, underscores, and
periods, and can be changed once every 30 days.

Profile pictures accept PNG, JPG, and JPEG files up to 10 MB. The application
stores the uploaded file ID and uses the Appwrite file-view URL so updated
avatars remain visible across profile, navigation, search, and feed surfaces.
Display names can be changed once every 30 days.

Like/save notifications require the Appwrite Function in
[`functions/create-notification`](./functions/create-notification). Configure
its server-only environment variables and execution permissions using that
function's README. Never put the Function API key in `.env.local` or any
`VITE_` variable.

### Run Locally

```bash
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Project Structure

```text
src/
├── _auth/                 # Public authentication layout and forms
├── _root/                 # Authenticated layouts and route pages
├── components/            # Shared UI, forms, and feature components
├── context/               # Authentication state provider
├── hooks/                 # Reusable React hooks
├── lib/
│   ├── appwrite/          # Appwrite client configuration and API calls
│   └── react-query/       # Query hooks and cache keys
└── types/                 # Shared TypeScript types

public/
└── assets/                # Static icons, branding, and images
```

## Database and Storage Setup

Create these Appwrite resources and place their IDs in `.env.local`:

- **Users** table: application profile data linked to an Appwrite Account
- **Posts** table: creator relationship, caption, image URL, image-file ID, location, tags, likes, and saves
- **Saves** table: user-to-post saved-record relationship
- **Follows** table: `follower` and `following` profile IDs, with key indexes on both fields
- **Comments** table: `post`, `author`, and `content` fields, with a key index on `post`
- **Reports** table: `reporter`, `targetType`, `targetId`, and `reason`; enable authenticated Create and keep reads private
- **Media** bucket: uploaded post and profile images

The existing Posts table uses `imageid` (lowercase `i`) for the image-file ID column. Keep that key if you use the supplied Appwrite schema.

Authenticated users need the relevant permissions on the tables and media bucket. At a minimum, grant the operations used by the client: create/read for profile records; create/read/update/delete for posts and saves; and create/read/update/delete for media files. Without storage create permission, image-post creation will fail before a post row is created.

For the Follows and Comments tables, enable authenticated Create and public Read;
document permissions restrict follow deletion and comment editing/deletion to the
relevant user. For Reports, enable authenticated Create only and configure
document-level read permissions for the reporter. The notification type field
must accept `like`, `save`, `follow`, and `comment`.

Optional advanced tables:

- **InteractionEvents**: `userAccountId`, `eventType`, `postId`, `creatorId`,
  and `createdAt`. Enable authenticated Create and private owner Read. The
  client records impressions and likes/saves when this optional table is
  configured.

- **Safety**: `owner`, `target`, and `type` (`block` or `mute`). Enable
  authenticated Create, private Read, and owner Delete.
- **Drafts**: `owner`, `caption`, `location`, and `tags`. Enable authenticated
  Create and private owner Read/Update/Delete.
- **Notification Preferences**: `owner`, `likes`, `comments`, `follows`, and
  `saves`. Enable authenticated Create and private owner Read/Update/Delete.
- **Moderation**: the `/moderation` page reads Reports using Appwrite table
  permissions. Grant Read only to trusted moderator accounts; do not expose
  Reports with public Read.

For the moderation actions, also add these optional Reports attributes:
`status` (string, 30 characters), `moderatorNote` (string, 2200 characters),
`reviewedBy` (string, 100 characters), and `reviewedAt` (datetime). Existing
reports without `status` are treated as `pending`.

The `/drafts` page lists, opens, updates, and deletes cloud drafts. The
`/analytics` page calculates basic creator metrics from the signed-in user's
posts. Images are intentionally not stored inside draft metadata; select the
image again before publishing.

Private messaging uses the optional `Messages` collection. Create these
attributes:

- `sender` (string, 100)
- `recipient` (string, 100)
- `content` (string, 2000)
- `read` (boolean)

Create key indexes on `sender`, `recipient`, and `read`. The app stores profile
document IDs in `sender` and `recipient`. Message documents are created with
read and update permissions for both participants, using their Appwrite
authentication account IDs. Add the collection ID to `.env.local` as
`VITE_APPWRITE_MESSAGES_COLLECTION_ID`, restart Vite, and open `/messages`.
Users can also start a conversation from another user's profile.

The browser cannot grant a second user's row permission directly. Deploy the
existing `functions/create-notification` Function after adding its message
action, give it `APPWRITE_MESSAGES_COLLECTION_ID`, and set
`VITE_APPWRITE_MESSAGE_FUNCTION_ID` to that Function ID. The Function also
needs the same `APPWRITE_API_KEY` database document-create access used for
notifications.

The same Function protects moderation actions. Set
`MODERATOR_ACCOUNT_IDS` to a comma-separated allowlist of Appwrite Auth
account IDs and add `APPWRITE_REPORTS_COLLECTION_ID`,
`APPWRITE_POST_COLLECTION_ID`, and `APPWRITE_COMMENTS_COLLECTION_ID` to the
Function environment. Report updates and reported-content deletion are then
authorized server-side.

Comment creation and editing also go through this Function. The server applies
basic abusive, hateful, and self-harm language checks before writing a comment;
blocked content returns a moderation message and is not stored. Make sure the
Function API key has create and update access to the Comments collection and
read access to the Users collection.

To add project-specific blocked words or phrases, add
`BLOCKED_COMMENT_TERMS=term-one,term two` to the Function variables and
redeploy. Avoid blocking ordinary words that may appear in legitimate
conversation.

The same Function can provide the optional AI caption assistant. Gemini is the
default provider: configure `GEMINI_API_KEY` and optionally `GEMINI_MODEL` in
the Function environment. Set `AI_PROVIDER=openai` only when using the
OpenAI-compatible fallback with `AI_API_KEY`. Never put provider keys in
`.env.local`. The post composer calls the Function for `generate-caption` and
`generate-hashtags`, and users must insert and submit generated text manually.

### Recommended indexes

Create key indexes on `Users.accountId`, `Users.username`, `Comments.post`, `Follows.follower`,
`Follows.following`, `Reports.reporter`, `Reports.targetId`,
`Safety.owner`, and `Drafts.owner`. Keep ID index lengths near 100 and enum
values near 30 rather than using the maximum attribute length for every index.
Keep the existing full-text index on `Users.username` as well if Explore username
search is enabled.

### Storage permissions

The Media bucket must allow authenticated users to Read files. The client also
adds authenticated file-read permission to newly uploaded files. If files were
uploaded before this permission was configured, re-upload them or update their
file permissions in Appwrite.

## Authentication

Linkora creates Appwrite email/password accounts and starts an email session. Once authenticated, the client retrieves the related application profile through the Users table. If an account has a valid session but its profile document is missing, the app attempts to restore that profile using the authenticated account details.

## Deployment

The repository includes `vercel.json` with a single-page-app rewrite rule. To deploy on Vercel:

1. Import this repository into Vercel.
2. Set the same Appwrite environment variables from `.env.example` in the Vercel project settings.
3. Set the Appwrite web platform hostname to the deployed domain.
4. Deploy using Vercel's default Vite settings (`npm run build`, output directory `dist`).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check the project and build production assets |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint over TypeScript source files |

## Troubleshooting

**The application cannot sign in or create an account**

Confirm the Appwrite endpoint, project ID, and web-platform hostname. Use a unique password that Appwrite does not flag as breached.

**Creating a post fails with a permission error**

Check that the media bucket grants authenticated users **Create** permission. Also confirm the Posts table grants the required create/read/update/delete permissions.

**An uploaded image does not display**

Use PNG, JPEG, or WebP. Existing `.ico` files are not supported as feed-image previews.
Open the Media bucket permissions and enable **Read** for authenticated users
(`Users`). Existing files may need to be re-uploaded after changing this
permission; newly uploaded files receive authenticated read access directly.

## Contributing

1. Fork the repository and create a focused branch from `main`.
2. Make a small, well-scoped change.
3. Run `npm run lint` and `npm run build` before opening a pull request.
4. Describe the change, relevant setup updates, and manual testing in the pull request.

## License

This repository does not currently include a license. Do not assume permission for reuse, redistribution, or commercial use without authorization from the repository owner.

## Author

[Dishant Saini](https://github.com/DishantSaini55)
