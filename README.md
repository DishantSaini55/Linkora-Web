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
- **Media** bucket: uploaded post and profile images

The existing Posts table uses `imageid` (lowercase `i`) for the image-file ID column. Keep that key if you use the supplied Appwrite schema.

Authenticated users need the relevant permissions on the tables and media bucket. At a minimum, grant the operations used by the client: create/read for profile records; create/read/update/delete for posts and saves; and create/read/update/delete for media files. Without storage create permission, image-post creation will fail before a post row is created.

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

## Contributing

1. Fork the repository and create a focused branch from `main`.
2. Make a small, well-scoped change.
3. Run `npm run lint` and `npm run build` before opening a pull request.
4. Describe the change, relevant setup updates, and manual testing in the pull request.

## License

This repository does not currently include a license. Do not assume permission for reuse, redistribution, or commercial use without authorization from the repository owner.

## Author

[Dishant Saini](https://github.com/DishantSaini55)
