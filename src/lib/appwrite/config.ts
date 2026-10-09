import { Client, Account, Databases, Storage, Avatars, Functions } from "appwrite";

export const appwriteConfig = {
  url: import.meta.env.VITE_APPWRITE_URL,
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
  storageId: import.meta.env.VITE_APPWRITE_STORAGE_ID,
  userCollectionId: import.meta.env.VITE_APPWRITE_USER_COLLECTION_ID,
  postCollectionId: import.meta.env.VITE_APPWRITE_POST_COLLECTION_ID,
  savesCollectionId: import.meta.env.VITE_APPWRITE_SAVES_COLLECTION_ID,
  followsCollectionId: import.meta.env.VITE_APPWRITE_FOLLOWS_COLLECTION_ID,
  commentsCollectionId: import.meta.env.VITE_APPWRITE_COMMENTS_COLLECTION_ID,
  reportsCollectionId: import.meta.env.VITE_APPWRITE_REPORTS_COLLECTION_ID,
  safetyCollectionId: import.meta.env.VITE_APPWRITE_SAFETY_COLLECTION_ID,
  draftsCollectionId: import.meta.env.VITE_APPWRITE_DRAFTS_COLLECTION_ID,
  messagesCollectionId: import.meta.env.VITE_APPWRITE_MESSAGES_COLLECTION_ID,
  preferencesCollectionId:
    import.meta.env.VITE_APPWRITE_PREFERENCES_COLLECTION_ID,
  notificationCollectionId:
    import.meta.env.VITE_APPWRITE_NOTIFICATION_COLLECTION_ID,
  notificationFunctionId:
    import.meta.env.VITE_APPWRITE_NOTIFICATION_FUNCTION_ID,
  messageFunctionId:
    import.meta.env.VITE_APPWRITE_MESSAGE_FUNCTION_ID ||
    import.meta.env.VITE_APPWRITE_NOTIFICATION_FUNCTION_ID,
  moderationFunctionId:
    import.meta.env.VITE_APPWRITE_MODERATION_FUNCTION_ID ||
    import.meta.env.VITE_APPWRITE_NOTIFICATION_FUNCTION_ID,
};

export const isAppwriteConfigured = [
  appwriteConfig.url,
  appwriteConfig.projectId,
  appwriteConfig.databaseId,
  appwriteConfig.storageId,
  appwriteConfig.userCollectionId,
  appwriteConfig.postCollectionId,
  appwriteConfig.savesCollectionId,
].every((value) => typeof value === "string" && value.length > 0);

export const isNotificationsConfigured =
  typeof appwriteConfig.notificationCollectionId === "string" &&
  appwriteConfig.notificationCollectionId.length > 0 &&
  typeof appwriteConfig.notificationFunctionId === "string" &&
  appwriteConfig.notificationFunctionId.length > 0;

export const isFollowsConfigured =
  typeof appwriteConfig.followsCollectionId === "string" &&
  appwriteConfig.followsCollectionId.length > 0;

export const isCommentsConfigured =
  typeof appwriteConfig.commentsCollectionId === "string" &&
  appwriteConfig.commentsCollectionId.length > 0;

export const isReportsConfigured =
  typeof appwriteConfig.reportsCollectionId === "string" &&
  appwriteConfig.reportsCollectionId.length > 0;

export const isSafetyConfigured =
  typeof appwriteConfig.safetyCollectionId === "string" &&
  appwriteConfig.safetyCollectionId.length > 0;

export const isDraftsConfigured =
  typeof appwriteConfig.draftsCollectionId === "string" &&
  appwriteConfig.draftsCollectionId.length > 0;

export const isPreferencesConfigured =
  typeof appwriteConfig.preferencesCollectionId === "string" &&
  appwriteConfig.preferencesCollectionId.length > 0;

export const isMessagesConfigured =
  typeof appwriteConfig.messagesCollectionId === "string" &&
  appwriteConfig.messagesCollectionId.length > 0;

export const isMessageFunctionConfigured =
  typeof appwriteConfig.messageFunctionId === "string" &&
  appwriteConfig.messageFunctionId.length > 0;

export const isModerationFunctionConfigured =
  typeof appwriteConfig.moderationFunctionId === "string" &&
  appwriteConfig.moderationFunctionId.length > 0;

export const client = new Client();

if (isAppwriteConfigured) {
  client.setEndpoint(appwriteConfig.url);
  client.setProject(appwriteConfig.projectId);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);
