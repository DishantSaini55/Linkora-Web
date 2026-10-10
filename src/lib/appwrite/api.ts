import { ID, Permission, Query, Role, Models } from "appwrite";

import {
  appwriteConfig,
  account,
  databases,
  functions,
  storage,
  avatars,
  isNotificationsConfigured,
  isFollowsConfigured,
  isCommentsConfigured,
  isReportsConfigured,
  isSafetyConfigured,
  isDraftsConfigured,
  isPreferencesConfigured,
  isMessagesConfigured,
  isInteractionEventsConfigured,
  isMessageFunctionConfigured,
  isModerationFunctionConfigured,
} from "./config";
import { IUpdatePost, INewPost, INewUser, IUpdateUser } from "@/types";

// ============================================================
// AUTH
// ============================================================

// ============================== SIGN UP
export async function createUserAccount(user: INewUser) {
  const newAccount = await account.create(
    ID.unique(),
    user.email,
    user.password,
    user.name
  );

  if (!newAccount) throw new Error("Appwrite did not create the account.");

  // Authenticate before writing the profile. This lets the collection use the
  // safer "Users" create permission rather than allowing anonymous writes.
  await account.createEmailSession(user.email, user.password);

  const avatarUrl = avatars.getInitials(user.name);

  return saveUserToDB({
    accountId: newAccount.$id,
    name: newAccount.name,
    email: newAccount.email,
    username: user.username,
    imageUrl: avatarUrl,
  });
}

// ============================== SAVE USER TO DB
export async function saveUserToDB(user: {
  accountId: string;
  email: string;
  name: string;
  imageUrl: URL;
  username?: string;
}) {
  if (!user.accountId) {
    throw new Error("Appwrite returned an account without an ID.");
  }

  // Keep the document data explicit and serializable. This also makes its
  // attribute names match the Users collection schema exactly.
  const profile = {
    accountId: user.accountId,
    name: user.name,
    email: user.email,
    username: user.username ?? "",
    imageUrl: user.imageUrl.toString(),
  };

  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    ID.unique(),
    profile
  );
}

// ============================== SIGN IN
export async function signInAccount(user: { email: string; password: string }) {
  return account.createEmailSession(user.email, user.password);
}

// ============================== GET ACCOUNT
export async function getAccount() {
  try {
    return await account.get();
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 401
    ) {
      return null;
    }

    throw error;
  }
}

// ============================== GET USER
export async function getCurrentUser() {
  const currentAccount = await getAccount();

  if (!currentAccount) return null;

  const currentUser = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    [Query.equal("accountId", currentAccount.$id)]
  );

  if (currentUser.documents.length > 0) return currentUser.documents[0];

  // A previous signup may have created the Auth account but failed before
  // creating its profile. Repair that state once the user has a session.
  const avatarUrl = avatars.getInitials(currentAccount.name);
  return saveUserToDB({
    accountId: currentAccount.$id,
    name: currentAccount.name,
    email: currentAccount.email,
    username: currentAccount.email.split("@")[0],
    imageUrl: avatarUrl,
  });
}

// ============================== SIGN OUT
export async function signOutAccount() {
  return account.deleteSession("current");
}

// ============================================================
// POSTS
// ============================================================

// ============================== CREATE POST
export async function createPost(post: INewPost) {
  let uploadedFile: Awaited<ReturnType<typeof uploadFile>> | undefined;

  try {
    // Upload file to appwrite storage
    uploadedFile = await uploadFile(post.file[0]);

    if (!uploadedFile) throw Error;

    // Get file url
    const fileUrl = getFilePreview(uploadedFile.$id);
    if (!fileUrl) {
      await deleteFile(uploadedFile.$id);
      throw Error;
    }

    // Convert tags into array
    const tags = post.tags?.replace(/ /g, "").split(",") || [];

    // Create post
    const newPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      ID.unique(),
      {
        creator: post.userId,
        caption: post.caption,
        imageUrl: fileUrl,
        imageid: uploadedFile.$id,
        location: post.location,
        tags,
      }
    );

    if (!newPost) {
      await deleteFile(uploadedFile.$id);
      throw Error;
    }

    return newPost;
  } catch (error) {
    if (uploadedFile?.$id) await deleteFile(uploadedFile.$id);
    throw error;
  }
}

// ============================== UPLOAD FILE
export async function uploadFile(file: File) {
  return storage.createFile(
    appwriteConfig.storageId,
    ID.unique(),
    file,
    [Permission.read(Role.users())]
  );
}

// ============================== GET FILE URL
export function getFilePreview(fileId: string, width = 2000, height = 2000) {
  return storage.getFilePreview(
    appwriteConfig.storageId,
    fileId,
    width,
    height,
    "top",
    100
  );
}

export function getFileView(fileId: string) {
  return storage.getFileView(appwriteConfig.storageId, fileId);
}

export function getPostImageUrl(post: Models.Document) {
  const imageId = post.imageid || post.imageId;
  return imageId
    ? storage
        .getFileView(appwriteConfig.storageId, imageId)
        .toString()
    : post.imageUrl || "/assets/icons/profile-placeholder.svg";
}

export function getUserImageUrl(
  user: Partial<Models.Document> & { imageId?: string; imageUrl?: string }
) {
  return user.imageId
    ? storage.getFileView(appwriteConfig.storageId, user.imageId).toString()
    : user.imageUrl || "/assets/icons/profile-placeholder.svg";
}

// ============================== DELETE FILE
export async function deleteFile(fileId: string) {
  await storage.deleteFile(appwriteConfig.storageId, fileId);
  return { status: "ok" };
}

// ============================== GET POSTS
export async function searchPosts(searchTerm: string) {
  return databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.postCollectionId,
    [Query.search("caption", searchTerm)]
  );
}

export async function getInfinitePosts({
  pageParam,
}: {
  pageParam?: unknown;
}) {
  const queries = [Query.orderDesc("$updatedAt"), Query.limit(9)];

  if (typeof pageParam === "string" && pageParam.length > 0) {
    queries.push(Query.cursorAfter(pageParam));
  }

  return databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.postCollectionId,
    queries
  );
}

// ============================== GET POST BY ID
export async function getPostById(postId?: string) {
  if (!postId) throw new Error("A post ID is required.");

  return databases.getDocument(
    appwriteConfig.databaseId,
    appwriteConfig.postCollectionId,
    postId
  );
}

// ============================== UPDATE POST
export async function updatePost(post: IUpdatePost) {
  const hasFileToUpdate = post.file.length > 0;

  try {
    let image = {
      imageUrl: post.imageUrl,
      imageId: post.imageId,
    };

    if (hasFileToUpdate) {
      // Upload new file to appwrite storage
      const uploadedFile = await uploadFile(post.file[0]);
      if (!uploadedFile) throw Error;

      // Get new file url
      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    // Convert tags into array
    const tags = post.tags?.replace(/ /g, "").split(",") || [];

    //  Update post
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      post.postId,
      {
        caption: post.caption,
        imageUrl: image.imageUrl,
        imageid: image.imageId,
        location: post.location,
        tags,
      }
    );

    // Failed to update
    if (!updatedPost) {
      // Delete new file that has been recently uploaded
      if (hasFileToUpdate) {
        await deleteFile(image.imageId);
      }

      // If no new file uploaded, just throw error
      throw Error;
    }

    // Safely delete old file after successful update
    if (hasFileToUpdate) {
      await deleteFile(post.imageId);
    }

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== DELETE POST
export async function deletePost(postId?: string, imageId?: string) {
  if (!postId) {
    throw new Error("A post ID is required.");
  }

  try {
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );

    if (!statusCode) throw Error;

    if (imageId) await deleteFile(imageId);

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== LIKE / UNLIKE POST
export async function likePost(postId: string, likesArray: string[]) {
  try {
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      {
        likes: likesArray,
      }
    );

    if (!updatedPost) throw Error;

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== SAVE POST
export async function savePost(userId: string, postId: string) {
  try {
    const updatedPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      ID.unique(),
      {
        user: userId,
        post: postId,
      }
    );

    if (!updatedPost) throw Error;

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}
// ============================== DELETE SAVED POST
export async function deleteSavedPost(savedRecordId: string) {
  try {
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      savedRecordId
    );

    if (!statusCode) throw Error;

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

export async function createNotification(notification: {
    recipient: string;
    actor: string;
    type: "like" | "save" | "follow" | "comment";
    post: string;
  }) {
    if (
      !isNotificationsConfigured ||
      typeof appwriteConfig.notificationFunctionId !== "string"
    ) {
      return null;
    }

    return functions.createExecution(
      appwriteConfig.notificationFunctionId,
      JSON.stringify(notification),
      false,
      "/",
      "POST",
      { "Content-Type": "application/json" }
    );
}

export async function getNotifications(
  recipient: string
): Promise<Models.Document[]> {
    if (!isNotificationsConfigured) return [];

    const notifications = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationCollectionId,
      [
        Query.equal("recipient", recipient),
        Query.orderDesc("$createdAt"),
        Query.limit(50),
      ]
    );

    return notifications.documents;
}

export async function getUnreadNotificationCount(recipient: string) {
  if (!isNotificationsConfigured) return 0;
  const notifications = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.notificationCollectionId,
    [Query.equal("recipient", recipient), Query.equal("read", false), Query.limit(1)]
  );
  return notifications.total;
}

export async function markNotificationsRead(recipient: string) {
  if (
    !isNotificationsConfigured ||
    typeof appwriteConfig.notificationFunctionId !== "string"
  ) {
    return null;
  }

  return functions.createExecution(
    appwriteConfig.notificationFunctionId,
    JSON.stringify({ action: "mark-read", recipient }),
    false,
    "/",
    "POST",
    { "Content-Type": "application/json" }
  );
}

export async function getFollowRelationship(
  follower: string,
  following: string
) {
  if (!isFollowsConfigured) return null;

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.followsCollectionId,
    [
      Query.equal("follower", follower),
      Query.equal("following", following),
      Query.limit(1),
    ]
  );

  return result.documents[0] || null;
}

export async function getFollowCounts(userId: string) {
  if (!isFollowsConfigured) return { followers: 0, following: 0 };

  const [followers, following] = await Promise.all([
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("following", userId), Query.limit(1)]
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.followsCollectionId,
      [Query.equal("follower", userId), Query.limit(1)]
    ),
  ]);

  return {
    followers: followers.total,
    following: following.total,
  };
}

export async function getFollowingProfileIds(userId: string) {
  if (!isFollowsConfigured || !userId) return [];

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.followsCollectionId,
    [Query.equal("follower", userId), Query.limit(100)]
  );

  return result.documents
    .map((document) => document.following)
    .filter((profileId): profileId is string => typeof profileId === "string");
}

export async function createInteractionEvent(event: {
  userAccountId: string;
  eventType: "impression" | "like" | "save" | "comment" | "follow";
  postId: string;
  creatorId?: string;
}) {
  if (!isInteractionEventsConfigured) return null;
  if (!event.userAccountId || !event.postId) return null;

  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.interactionEventsCollectionId,
    ID.unique(),
    {
      userAccountId: event.userAccountId,
      eventType: event.eventType,
      postId: event.postId,
      ...(event.creatorId ? { creatorId: event.creatorId } : {}),
      createdAt: new Date().toISOString(),
    },
    [Permission.read(Role.user(event.userAccountId))]
  );
}

export async function createFollow(
  follower: string,
  following: string,
  followerAccountId: string
) {
  if (!isFollowsConfigured) {
    throw new Error("Follow collection is not configured.");
  }

  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.followsCollectionId,
    ID.unique(),
    { follower, following },
    [
      Permission.read(Role.any()),
      Permission.delete(Role.user(followerAccountId)),
    ]
  );
}

export async function deleteFollow(followId: string) {
  if (!isFollowsConfigured) {
    throw new Error("Follow collection is not configured.");
  }

  return databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.followsCollectionId,
    followId
  );
}

export async function getComments(
  postId: string
): Promise<Models.Document[]> {
  if (!isCommentsConfigured) return [];

  const comments = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.commentsCollectionId,
    [
      Query.equal("post", postId),
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]
  );

  return comments.documents;
}

export async function createComment(
  postId: string,
  authorId: string,
  content: string,
  authorAccountId: string
) {
  if (!isCommentsConfigured) {
    throw new Error("Comments collection is not configured.");
  }

  if (!isModerationFunctionConfigured) {
    throw new Error("Moderation Function is not configured.");
  }

  const execution = await functions.createExecution(
    appwriteConfig.moderationFunctionId,
    JSON.stringify({
      action: "create-comment",
      postId,
      authorId,
      authorAccountId,
      content: content.trim(),
    }),
    false,
    "/",
    "POST",
    { "Content-Type": "application/json" }
  );
  if (
    execution.status === "failed" ||
    execution.responseStatusCode < 200 ||
    execution.responseStatusCode >= 300
  ) {
    let message = execution.responseBody || "Comment was rejected.";
    try {
      const responseBody = JSON.parse(execution.responseBody || "{}");
      if (typeof responseBody.message === "string") message = responseBody.message;
    } catch {
      // Preserve the Function response when it is not JSON.
    }
    throw new Error(message);
  }
  return JSON.parse(execution.responseBody || "{}");
}

export async function createReport(
  reporter: string,
  targetType: "post" | "comment",
  targetId: string,
  reason: string
) {
  if (!isReportsConfigured) {
    throw new Error("Reports collection is not configured.");
  }

  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.reportsCollectionId,
    ID.unique(),
    { reporter, targetType, targetId, reason },
    [Permission.read(Role.user(reporter))]
  );
}

export async function getReports() {
  if (!isReportsConfigured) return [];
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.reportsCollectionId,
    [Query.orderDesc("$createdAt"), Query.limit(100)]
  );

  return Promise.all(
    result.documents.map(async (report) => {
      const [reporterResult, targetResult] = await Promise.allSettled([
        getUserByAccountId(report.reporter),
        resolveReportTarget(report.targetType, report.targetId),
      ]);

      return {
        ...report,
        reporterProfile:
          reporterResult.status === "fulfilled"
            ? reporterResult.value
            : null,
        targetDetails:
          targetResult.status === "fulfilled" ? targetResult.value : null,
        detailsError:
          reporterResult.status === "rejected" ||
          targetResult.status === "rejected"
            ? "Some report details are unavailable because the related record was deleted or cannot be read."
            : null,
      };
    })
  );
}

export async function updateReport(
  reportId: string,
  update: {
    status: "pending" | "reviewed" | "dismissed" | "action_taken";
    moderatorNote?: string;
    reviewedBy?: string;
    reviewedAt?: string;
  }
) {
  if (!isReportsConfigured) {
    throw new Error("Reports collection is not configured.");
  }
  if (!isModerationFunctionConfigured) {
    throw new Error("Moderation Function is not configured.");
  }
  return executeModerationAction({
    action: "update-report",
    reportId,
    ...update,
  });
}

export async function deleteModeratedContent(
  targetType: "post" | "comment",
  targetId: string,
  reportId: string
) {
  if (!isModerationFunctionConfigured) {
    throw new Error("Moderation Function is not configured.");
  }
  return executeModerationAction({
    action: "delete-content",
    targetType,
    targetId,
    reportId,
  });
}

async function executeModerationAction(payload: Record<string, unknown>) {
  const execution = await functions.createExecution(
    appwriteConfig.moderationFunctionId,
    JSON.stringify(payload),
    false,
    "/",
    "POST",
    { "Content-Type": "application/json" }
  );
  if (
    execution.status === "failed" ||
    execution.responseStatusCode < 200 ||
    execution.responseStatusCode >= 300
  ) {
    let message = "Moderation action failed.";
    try {
      const responseBody = JSON.parse(execution.responseBody || "{}");
      if (typeof responseBody.message === "string") message = responseBody.message;
    } catch {
      if (execution.responseBody) message = execution.responseBody;
    }
    throw new Error(message);
  }
  return execution;
}

async function resolveReportTarget(
  targetType: "post" | "comment",
  targetId: string
) {
  if (targetType === "post") {
    const post = await getPostById(targetId);
    return { post, comment: null };
  }

  if (!isCommentsConfigured) {
    throw new Error("Comments collection is not configured.");
  }

  const comment = await databases.getDocument(
    appwriteConfig.databaseId,
    appwriteConfig.commentsCollectionId,
    targetId
  );
  const post = await getPostById(comment.post);

  return { post, comment };
}

export async function getSafetyRelationships(userId: string) {
  if (!isSafetyConfigured) return [];
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.safetyCollectionId,
    [Query.equal("owner", userId), Query.limit(100)]
  );
  return result.documents;
}

export async function setSafetyRelationship(
  owner: string,
  target: string,
  type: "block" | "mute",
  existingId?: string,
  ownerAccountId?: string
) {
  if (!isSafetyConfigured) {
    throw new Error("Safety collection is not configured.");
  }
  if (existingId) {
    return databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.safetyCollectionId,
      existingId
    );
  }
  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.safetyCollectionId,
    ID.unique(),
    { owner, target, type },
    [
      Permission.read(Role.user(ownerAccountId || owner)),
      Permission.delete(Role.user(ownerAccountId || owner)),
    ]
  );
}

export async function getDrafts(owner: string) {
  if (!isDraftsConfigured) return [];
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.draftsCollectionId,
    [Query.equal("owner", owner), Query.orderDesc("$updatedAt"), Query.limit(20)]
  );
  return result.documents;
}

export async function saveDraft(
  owner: string,
  draft: {
    caption: string;
    location: string;
    tags: string;
    imageId?: string;
    imageUrl?: string;
  },
  draftId?: string,
  ownerAccountId?: string
) {
  if (!isDraftsConfigured) {
    throw new Error("Drafts collection is not configured.");
  }
  if (draftId) {
    return databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.draftsCollectionId,
      draftId,
      draft
    );
  }
  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.draftsCollectionId,
    ID.unique(),
    { owner, ...draft },
    [
      Permission.read(Role.user(ownerAccountId || owner)),
      Permission.update(Role.user(ownerAccountId || owner)),
      Permission.delete(Role.user(ownerAccountId || owner)),
    ]
  );
}

export async function deleteDraft(draftId: string) {
  if (!isDraftsConfigured) {
    throw new Error("Drafts collection is not configured.");
  }
  return databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.draftsCollectionId,
    draftId
  );
}

export type NotificationPreferences = {
  likes: boolean;
  comments: boolean;
  follows: boolean;
  saves: boolean;
};

export async function getNotificationPreferences(owner: string) {
  if (!isPreferencesConfigured) return null;
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.preferencesCollectionId,
    [Query.equal("owner", owner), Query.limit(1)]
  );
  return result.documents[0] || null;
}

export async function saveNotificationPreferences(
  owner: string,
  accountId: string,
  preferences: NotificationPreferences,
  preferenceId?: string
) {
  if (!isPreferencesConfigured) return null;
  if (preferenceId) {
    return databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.preferencesCollectionId,
      preferenceId,
      preferences
    );
  }
  return databases.createDocument(
    appwriteConfig.databaseId,
    appwriteConfig.preferencesCollectionId,
    ID.unique(),
    { owner, ...preferences },
    [
      Permission.read(Role.user(accountId)),
      Permission.update(Role.user(accountId)),
      Permission.delete(Role.user(accountId)),
    ]
  );
}

export async function updateComment(
  commentId: string,
  content: string,
  authorAccountId: string
) {
  if (!isCommentsConfigured) {
    throw new Error("Comments collection is not configured.");
  }

  if (!isModerationFunctionConfigured) {
    throw new Error("Moderation Function is not configured.");
  }

  const execution = await functions.createExecution(
    appwriteConfig.moderationFunctionId,
    JSON.stringify({
      action: "update-comment",
      commentId,
      authorAccountId,
      content: content.trim(),
    }),
    false,
    "/",
    "POST",
    { "Content-Type": "application/json" }
  );
  if (
    execution.status === "failed" ||
    execution.responseStatusCode < 200 ||
    execution.responseStatusCode >= 300
  ) {
    let message = execution.responseBody || "Comment update was rejected.";
    try {
      const responseBody = JSON.parse(execution.responseBody || "{}");
      if (typeof responseBody.message === "string") message = responseBody.message;
    } catch {
      // Preserve the Function response when it is not JSON.
    }
    throw new Error(message);
  }
  return JSON.parse(execution.responseBody || "{}");
}

export async function deleteComment(commentId: string, accountId: string) {
  if (!isCommentsConfigured) {
    throw new Error("Comments collection is not configured.");
  }

  if (!isModerationFunctionConfigured) {
    throw new Error("Moderation Function is not configured.");
  }

  const execution = await functions.createExecution(
    appwriteConfig.moderationFunctionId,
    JSON.stringify({
      action: "delete-comment",
      commentId,
      accountId,
    }),
    false,
    "/",
    "POST",
    { "Content-Type": "application/json" }
  );
  if (
    execution.status === "failed" ||
    execution.responseStatusCode < 200 ||
    execution.responseStatusCode >= 300
  ) {
    let message = execution.responseBody || "Comment deletion failed.";
    try {
      const responseBody = JSON.parse(execution.responseBody || "{}");
      if (typeof responseBody.message === "string") message = responseBody.message;
    } catch {
      // Preserve the Function response when it is not JSON.
    }
    throw new Error(message);
  }
  return JSON.parse(execution.responseBody || "{}");
}

// ============================== GET USER'S POST
export async function getUserPosts(userId?: string) {
  if (!userId) throw new Error("A user ID is required.");

  return databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.postCollectionId,
    [Query.equal("creator", userId), Query.orderDesc("$createdAt")]
  );
}

// ============================== GET POPULAR POSTS (BY HIGHEST LIKE COUNT)
export async function getRecentPosts() {
  return databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.postCollectionId,
    [Query.orderDesc("$createdAt"), Query.limit(20)]
  );
}

// ============================================================
// USER
// ============================================================

// ============================== GET USERS
export async function getUsers(limit?: number) {
  const queries = [Query.orderDesc("$createdAt")];

  if (limit) {
    queries.push(Query.limit(limit));
  }

  return databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    queries
  );
}

export async function searchUsers(searchTerm: string) {
  return databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    [Query.search("username", searchTerm), Query.limit(20)]
  );
}

// ============================== GET USER BY ID
export async function getUserById(userId: string) {
  return databases.getDocument(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    userId
  );
}

export async function getUserByAccountId(accountId: string) {
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.userCollectionId,
    [Query.equal("accountId", accountId), Query.limit(1)]
  );

  return result.documents[0] ?? null;
}

export async function getMessagesForUser(userId: string) {
  if (!isMessagesConfigured) return [];
  const [sent, received] = await Promise.all([
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      [Query.equal("sender", userId), Query.orderAsc("$createdAt"), Query.limit(100)]
    ),
    databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.messagesCollectionId,
      [Query.equal("recipient", userId), Query.orderAsc("$createdAt"), Query.limit(100)]
    ),
  ]);
  return [...sent.documents, ...received.documents].sort(
    (a, b) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime()
  );
}

export async function getUnreadMessageCount(userId: string) {
  if (!isMessagesConfigured) return 0;
  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.messagesCollectionId,
    [Query.equal("recipient", userId), Query.equal("read", false), Query.limit(1)]
  );
  return result.total;
}

export async function getUserPresence(userId: string) {
  if (!appwriteConfig.presenceCollectionId) return null;
  try {
    const presence = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.presenceCollectionId,
      userId
    );
    const isFresh =
      Date.now() - new Date(presence.updatedAt).getTime() < 30_000;
    return isFresh
      ? {
          online: presence.online === true,
          typingTo: typeof presence.typingTo === "string" ? presence.typingTo : "",
        }
      : { online: false, typingTo: "" };
  } catch (error) {
    if (
      error instanceof Error &&
      /not found|could not be found|404/i.test(error.message)
    ) {
      return null;
    }
    throw error;
  }
}

export async function setUserPresence(
  userId: string,
  accountId: string,
  online: boolean,
  typingTo = ""
) {
  if (!appwriteConfig.presenceCollectionId || !accountId) return null;
  const data = { online, typingTo, updatedAt: new Date().toISOString() };
  const permissions = [
    Permission.read(Role.users()),
    Permission.update(Role.user(accountId)),
    Permission.delete(Role.user(accountId)),
  ];
  try {
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.presenceCollectionId,
      userId,
      data
    );
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !/not found|could not be found|404/i.test(error.message)
    ) {
      throw error;
    }
    return databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.presenceCollectionId,
      userId,
      data,
      permissions
    );
  }
}

function normalizeAccountId(accountId: string) {
  return accountId
    .trim()
    .replace(/^user:/, "")
    .split("/", 1)[0];
}

export async function createMessage(
  sender: string,
  senderAccountId: string,
  recipient: string,
  recipientAccountId: string,
  content: string,
  attachment?: { id: string; url: string }
) {
  if (!isMessagesConfigured) {
    throw new Error("Messages collection is not configured.");
  }
  if (!isMessageFunctionConfigured) {
    throw new Error("Message Function is not configured.");
  }
  const senderId = normalizeAccountId(senderAccountId);
  const recipientId = normalizeAccountId(recipientAccountId);
  if (!senderId || !recipientId) {
    throw new Error("Both message participants must have valid Appwrite account IDs.");
  }
  const execution = await functions.createExecution(
    appwriteConfig.messageFunctionId,
    JSON.stringify({
      action: "send-message",
      recipient: recipientId,
      recipientProfileId: recipient,
      senderProfileId: sender,
      content: content.trim(),
      ...(attachment
        ? { attachmentId: attachment.id, attachmentUrl: attachment.url }
        : {}),
    }),
    false,
    "/",
    "POST",
    { "Content-Type": "application/json" }
  );
  if (
    execution.status === "failed" ||
    execution.responseStatusCode < 200 ||
    execution.responseStatusCode >= 300
  ) {
    let message = "Message Function failed to create the message.";
    try {
      const responseBody = JSON.parse(execution.responseBody || "{}");
      if (typeof responseBody.message === "string") {
        message = responseBody.message;
      }
    } catch {
      if (execution.responseBody) message = execution.responseBody;
    }
    throw new Error(message);
  }
  return execution;
}

export async function generateAiContent(request: {
  action: "generate-caption" | "generate-hashtags";
  topic: string;
  tone: "casual" | "professional" | "funny" | "inspirational" | "educational";
  length: "short" | "medium" | "long";
}) {
  if (!isMessageFunctionConfigured) {
    throw new Error("AI Function is not configured.");
  }
  const execution = await functions.createExecution(
    appwriteConfig.messageFunctionId,
    JSON.stringify(request),
    false,
    "/",
    "POST",
    { "Content-Type": "application/json" }
  );
  if (
    execution.status === "failed" ||
    execution.responseStatusCode < 200 ||
    execution.responseStatusCode >= 300
  ) {
    let message = "AI generation failed.";
    try {
      const body = JSON.parse(execution.responseBody || "{}");
      if (typeof body.message === "string") message = body.message;
    } catch {
      if (execution.responseBody) message = execution.responseBody;
    }
    throw new Error(message);
  }
  try {
    return JSON.parse(execution.responseBody || "{}") as {
      caption?: string;
      alternativeCaption?: string;
      hashtags: string[];
    };
  } catch {
    throw new Error("AI Function returned an invalid response.");
  }
}

export async function updateMessage(messageId: string, senderProfileId: string, content: string) {
  const execution = await functions.createExecution(
    appwriteConfig.messageFunctionId,
    JSON.stringify({ action: "edit-message", messageId, senderProfileId, content: content.trim() }),
    false,
    "/",
    "POST",
    { "Content-Type": "application/json" }
  );
  if (
    execution.status === "failed" ||
    execution.responseStatusCode < 200 ||
    execution.responseStatusCode >= 300
  ) {
    throw new Error(execution.responseBody || "Message edit failed.");
  }
  return execution;
}

export async function deleteMessage(messageId: string, senderProfileId: string) {
  const execution = await functions.createExecution(
    appwriteConfig.messageFunctionId,
    JSON.stringify({ action: "delete-message", messageId, senderProfileId }),
    false,
    "/",
    "POST",
    { "Content-Type": "application/json" }
  );
  if (
    execution.status === "failed" ||
    execution.responseStatusCode < 200 ||
    execution.responseStatusCode >= 300
  ) {
    throw new Error(execution.responseBody || "Message deletion failed.");
  }
  return execution;
}

export async function markMessageRead(messageId: string) {
  if (!isMessagesConfigured) return null;
  return databases.updateDocument(
    appwriteConfig.databaseId,
    appwriteConfig.messagesCollectionId,
    messageId,
    { read: true }
  );
}

// ============================== UPDATE USER
export async function updateUser(user: IUpdateUser) {
  const hasFileToUpdate = user.file.length > 0;
  let uploadedFileId: string | undefined;
  try {
    const existingUser = await getUserById(user.userId);
    const nameChanged = existingUser.name !== user.name;
    const usernameChanged = existingUser.username !== user.username;
    const nameChangedAt = existingUser.nameChangedAt
      ? new Date(existingUser.nameChangedAt)
      : null;
    const daysSinceNameChange = nameChangedAt
      ? (Date.now() - nameChangedAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (nameChanged && daysSinceNameChange < 30) {
      throw new Error("You can change your name once every 30 days.");
    }

    const usernameChangedAt = existingUser.usernameChangedAt
      ? new Date(existingUser.usernameChangedAt)
      : null;
    const daysSinceUsernameChange = usernameChangedAt
      ? (Date.now() - usernameChangedAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (usernameChanged && daysSinceUsernameChange < 30) {
      throw new Error("You can change your username once every 30 days.");
    }

    if (usernameChanged) {
      const matchingUsers = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [Query.equal("username", user.username), Query.limit(1)]
      );
      if (
        matchingUsers.documents.some(
          (matchingUser) => matchingUser.$id !== user.userId
        )
      ) {
        throw new Error("That username is already taken.");
      }
    }

    let image: { imageUrl: URL | string; imageId?: string } = {
      imageUrl: user.imageUrl,
      imageId: user.imageId,
    };

    if (hasFileToUpdate || user.removeImage) {
      if (user.removeImage && !hasFileToUpdate) {
        image = {
          imageUrl: avatars.getInitials(existingUser.name).toString(),
        };
      }
    }

    if (hasFileToUpdate) {
      // Upload new file to appwrite storage
      const uploadedFile = await uploadFile(user.file[0]);
      if (!uploadedFile) throw Error;
      uploadedFileId = uploadedFile.$id;

      // Get new file url
      const fileUrl = storage
        .getFileView(appwriteConfig.storageId, uploadedFile.$id)
        .toString();
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    //  Update user
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      user.userId,
      {
        name: user.name,
        username: user.username,
        bio: user.bio,
        imageUrl: image.imageUrl,
        imageId: image.imageId || "",
        ...(nameChanged ? { nameChangedAt: new Date().toISOString() } : {}),
        ...(usernameChanged
          ? { usernameChangedAt: new Date().toISOString() }
          : {}),
      }
    );

    // Failed to update
    if (!updatedUser) {
      throw new Error("Appwrite did not update the profile.");
    }

    // Safely delete old file after successful update
    if (user.imageId && (hasFileToUpdate || user.removeImage)) {
      await deleteFile(user.imageId);
    }

    return updatedUser;
  } catch (error) {
    if (uploadedFileId) {
      await deleteFile(uploadedFileId).catch(() => undefined);
    }
    throw error;
  }
}
