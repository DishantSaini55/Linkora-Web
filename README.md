# Linkora

Linkora is a responsive social platform for sharing visual posts, discovering creators, and building a saved collection. It is a client-side React application backed by Appwrite for authentication, data, and media storage.

## Highlights

- Email and password authentication with persistent sessions
- Create, edit, and delete visual posts
- Image uploads with PNG, JPEG, and WebP validation
- Explore recent posts and discover creators
- Like and save posts
- Editable user profiles
- Responsive desktop and mobile navigation

## Tech stack

- React 18 and TypeScript
- Vite
- Tailwind CSS and Radix UI
- TanStack Query
- Appwrite
- React Hook Form and Zod

## Getting started

### Prerequisites

- Node.js 18 or newer
- An Appwrite project

### Install

```bash
git clone https://github.com/DishantSaini55/LINKORA.git
cd LINKORA
npm install
```

Copy the example environment file and populate it with IDs from your Appwrite project:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173`.

## Environment variables

`VITE_` variables are exposed to the browser. Use Appwrite public identifiers only; never place an Appwrite API key in this application.

| Variable | Description |
| --- | --- |
| `VITE_APPWRITE_URL` | Appwrite endpoint, including `/v1` |
| `VITE_APPWRITE_PROJECT_ID` | Appwrite project ID |
| `VITE_APPWRITE_DATABASE_ID` | Linkora database ID |
| `VITE_APPWRITE_STORAGE_ID` | Media bucket ID |
| `VITE_APPWRITE_USER_COLLECTION_ID` | Users table ID |
| `VITE_APPWRITE_POST_COLLECTION_ID` | Posts table ID |
| `VITE_APPWRITE_SAVES_COLLECTION_ID` | Saves table ID |

> The variable names retain the original collection terminology for SDK compatibility. In the current Appwrite Console, these resources are shown as tables and rows.

## Appwrite setup

Create the following resources in your Appwrite project:

- A **Users** table for account profiles
- A **Posts** table for post content and media metadata
- A **Saves** table for saved-post records
- A **media** storage bucket for uploaded images

Grant authenticated users the permissions needed for the app flow:

- **Users**: create and read profiles
- **Posts**: create, read, update, and delete posts
- **Saves**: create, read, and delete saved records
- **media bucket**: create, read, update, and delete files

For this project’s existing Posts table, the image-file identifier column is named `imageid` (lowercase `i`). The application writes to that key.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Project structure

```text
src/
├── _auth/              # Sign-in and sign-up views
├── _root/              # Authenticated routes and pages
├── components/         # Shared UI and forms
├── context/            # Authentication state
├── lib/appwrite/       # Appwrite client and API functions
└── lib/react-query/    # Query hooks and cache keys
```

## License

This project is available for personal learning and portfolio use. Review the licenses of the included dependencies and third-party assets before commercial distribution.
