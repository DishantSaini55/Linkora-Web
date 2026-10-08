# Create notification Appwrite Function

This function creates like/save notifications with server-side credentials. The
browser cannot grant another user read access to a document, so notification
creation must happen here.

## Appwrite configuration

Create a Node.js Appwrite Function from `functions/create-notification` and set
the function's entrypoint to `src/main.js`.

Add these variables to the Function's environment:

- `APPWRITE_ENDPOINT`: the Appwrite API endpoint, including `/v1`
- `APPWRITE_PROJECT_ID`: the Linkora Appwrite project ID
- `APPWRITE_API_KEY`: a server API key with database document create access for
  the notifications table
- `APPWRITE_DATABASE_ID`: the Linkora database ID
- `APPWRITE_NOTIFICATION_COLLECTION_ID`: the notifications table ID

Allow authenticated users to execute the Function, but do not expose the API
key in the frontend. Set `VITE_APPWRITE_NOTIFICATION_FUNCTION_ID` in the
frontend `.env.local` to the deployed Function ID.
