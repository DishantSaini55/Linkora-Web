import { Client, Account, Databases, Storage, Avatars } from "appwrite";

export const appwriteConfig = {
  url: import.meta.env.VITE_APPWRITE_URL,
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
  storageId: import.meta.env.VITE_APPWRITE_STORAGE_ID,
  userCollectionId: import.meta.env.VITE_APPWRITE_USER_COLLECTION_ID,
  postCollectionId: import.meta.env.VITE_APPWRITE_POST_COLLECTION_ID,
  savesCollectionId: import.meta.env.VITE_APPWRITE_SAVES_COLLECTION_ID,
  notificationCollectionId:
    import.meta.env.VITE_APPWRITE_NOTIFICATION_COLLECTION_ID,
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
  appwriteConfig.notificationCollectionId.length > 0;

export const client = new Client();

if (isAppwriteConfigured) {
  client.setEndpoint(appwriteConfig.url);
  client.setProject(appwriteConfig.projectId);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);
