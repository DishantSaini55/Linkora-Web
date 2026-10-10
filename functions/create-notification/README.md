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
- `APPWRITE_MESSAGES_COLLECTION_ID`: the private Messages table ID
- `APPWRITE_USER_COLLECTION_ID`: the Users table ID, used to authorize edits
  to messages created before sender account IDs were stored
- `APPWRITE_REPORTS_COLLECTION_ID`: the Reports table ID
- `APPWRITE_POST_COLLECTION_ID`: the Posts table ID
- `APPWRITE_COMMENTS_COLLECTION_ID`: the Comments table ID
- `MODERATOR_ACCOUNT_IDS`: comma-separated Appwrite Auth account IDs allowed to moderate.
  `MODERATOR_ACCOUNT_ID` is also accepted for a single moderator.
- `AI_PROVIDER`: `gemini` (default) or `openai`
- `GEMINI_API_KEY`: server-only Gemini API key when using Gemini
- `GEMINI_MODEL`: optional Gemini model preference. The Function checks the
  models enabled for the API key and automatically uses an available model
  that supports `generateContent`. Leave this variable empty for automatic
  selection.
- `AI_API_KEY`: server-only OpenAI-compatible key when using OpenAI
- `AI_API_URL`: optional OpenAI chat-completions URL
- `AI_MODEL`: optional OpenAI model; defaults to `gpt-4o-mini`
- `BLOCKED_COMMENT_TERMS`: optional comma-separated extra words or phrases to
  block in comments. Terms are normalized before matching, so basic
  punctuation and common character substitutions are handled.

Allow authenticated users to execute the Function, but do not expose the API
key in the frontend. Set `VITE_APPWRITE_NOTIFICATION_FUNCTION_ID` in the
frontend `.env.local` to the deployed Function ID.

This Function also accepts the `send-message` action used by the messaging
feature. Set `VITE_APPWRITE_MESSAGE_FUNCTION_ID` to this same Function ID, or
leave it empty and the frontend will use the notification Function ID.

It also accepts `generate-caption` and `generate-hashtags` actions. Gemini is
the default provider. AI keys must remain in the Function environment and
never be added to a `VITE_` variable. The actions return validated JSON for
the post composer; they never publish a post.

The `create-comment` and `update-comment` actions perform server-side comment
moderation before creating or updating a comment. The Function API key needs
Comments create/update access and Users read access. Blocked comments return
HTTP 422 with code `COMMENT_MODERATION_BLOCKED`.
