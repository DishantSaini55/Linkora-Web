import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { Models } from "appwrite";

import { QUERY_KEYS } from "@/lib/react-query/queryKeys";
import {
  createUserAccount,
  signInAccount,
  getCurrentUser,
  signOutAccount,
  getUsers,
  searchUsers,
  createPost,
  getPostById,
  updatePost,
  getUserPosts,
  deletePost,
  likePost,
  getUserById,
  updateUser,
  getRecentPosts,
  getInfinitePosts,
  searchPosts,
  savePost,
  deleteSavedPost,
  createNotification,
  getNotifications,
  markNotificationsRead,
  getFollowRelationship,
  getFollowCounts,
  createFollow,
  deleteFollow,
  getComments,
  createComment,
  getUnreadNotificationCount,
  createReport,
  updateComment,
  deleteComment,
  getSafetyRelationships,
  setSafetyRelationship,
  getDrafts,
  saveDraft,
  deleteDraft,
  getReports,
  updateReport,
  getNotificationPreferences,
  saveNotificationPreferences,
  getMessagesForUser,
  getUnreadMessageCount,
  createMessage,
  markMessageRead,
  deleteModeratedContent,
  updateMessage,
  deleteMessage,
  generateAiContent,
} from "@/lib/appwrite/api";
import { INewPost, INewUser, IUpdatePost, IUpdateUser } from "@/types";

// ============================================================
// AUTH QUERIES
// ============================================================

export const useCreateUserAccount = () => {
  return useMutation({
    mutationFn: (user: INewUser) => createUserAccount(user),
  });
};

export const useSignInAccount = () => {
  return useMutation({
    mutationFn: (user: { email: string; password: string }) =>
      signInAccount(user),
  });
};

export const useSignOutAccount = () => {
  return useMutation({
    mutationFn: signOutAccount,
  });
};

// ============================================================
// POST QUERIES
// ============================================================

const invalidatePostQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  postId?: string,
  userId?: string
) => {
  queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.GET_INFINITE_POSTS],
  });
  queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
  });
  queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.SEARCH_POSTS],
  });
  queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.GET_USER_POSTS],
  });

  if (postId) {
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.GET_POST_BY_ID, postId],
    });
  }

  if (userId) {
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.GET_USER_POSTS, userId],
    });
  }
};

export const useGetPosts = () => {
  return useInfiniteQuery({
    queryKey: [QUERY_KEYS.GET_INFINITE_POSTS],
    queryFn: ({ pageParam }) => getInfinitePosts({ pageParam }),
    getNextPageParam: (lastPage: Models.DocumentList<Models.Document>) => {
      if (lastPage.documents.length === 0) {
        return null;
      }

      const lastId = lastPage.documents[lastPage.documents.length - 1].$id;
      return lastId;
    },
  });
};

export const useSearchPosts = (searchTerm: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.SEARCH_POSTS, searchTerm],
    queryFn: () => searchPosts(searchTerm),
    enabled: !!searchTerm,
  });
};

export const useSearchUsers = (searchTerm: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.SEARCH_USERS, searchTerm],
    queryFn: () => searchUsers(searchTerm),
    enabled: !!searchTerm,
  });

export const useGetRecentPosts = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
    queryFn: getRecentPosts,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: INewPost) => createPost(post),
    onSuccess: (_data, variables) => {
      invalidatePostQueries(queryClient, undefined, variables.userId);
    },
  });
};

export const useGenerateAiContent = () =>
  useMutation({
    mutationFn: generateAiContent,
  });

export const useGetPostById = (postId?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_POST_BY_ID, postId],
    queryFn: () => getPostById(postId),
    enabled: !!postId,
  });
};

export const useGetUserPosts = (userId?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_USER_POSTS, userId],
    queryFn: () => getUserPosts(userId),
    enabled: !!userId,
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: IUpdatePost) => updatePost(post),
    onSuccess: (data) => {
      invalidatePostQueries(queryClient, data?.$id);
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, imageId }: { postId?: string; imageId?: string }) =>
      deletePost(postId, imageId),
    onSuccess: (_data, variables) => {
      invalidatePostQueries(queryClient, variables.postId);
    },
  });
};

export const useDeleteModeratedContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      targetType,
      targetId,
      reportId,
    }: {
      targetType: "post" | "comment";
      targetId: string;
      reportId: string;
    }) => deleteModeratedContent(targetType, targetId, reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_POSTS] });
    },
  });
};

export const useLikePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      postId,
      likesArray,
    }: {
      postId: string;
      likesArray: string[];
    }) => likePost(postId, likesArray),
    onSuccess: (data) => {
      invalidatePostQueries(queryClient, data?.$id);
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_CURRENT_USER],
      });
    },
  });
};

export const useSavePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, postId }: { userId: string; postId: string }) =>
      savePost(userId, postId),
    onSuccess: () => {
      invalidatePostQueries(queryClient);
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_CURRENT_USER],
      });
    },
  });
};

export const useDeleteSavedPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (savedRecordId: string) => deleteSavedPost(savedRecordId),
    onSuccess: () => {
      invalidatePostQueries(queryClient);
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_CURRENT_USER],
      });
    },
  });
};

export const useCreateNotification = () => {
  return useMutation({
    mutationFn: (notification: {
      recipient: string;
      actor: string;
      type: "like" | "save" | "follow" | "comment";
      post: string;
    }) => createNotification(notification),
  });
};

export const useGetNotifications = (recipient?: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_NOTIFICATIONS, recipient],
    queryFn: () => getNotifications(recipient || ""),
    enabled: !!recipient,
  });
};

export const useGetUnreadNotificationCount = (recipient?: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.GET_UNREAD_NOTIFICATIONS, recipient],
    queryFn: () => getUnreadNotificationCount(recipient || ""),
    enabled: !!recipient,
    refetchInterval: 30000,
  });

export const useCreateReport = () =>
  useMutation({
    mutationFn: ({
      reporter,
      targetType,
      targetId,
      reason,
    }: {
      reporter: string;
      targetType: "post" | "comment";
      targetId: string;
      reason: string;
    }) => createReport(reporter, targetType, targetId, reason),
  });

export const useGetReports = () =>
  useQuery<Models.Document[]>({
    queryKey: ["reports"],
    queryFn: getReports,
  });

export const useUpdateReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reportId,
      status,
      moderatorNote,
      reviewedBy,
    }: {
      reportId: string;
      status: "pending" | "reviewed" | "dismissed" | "action_taken";
      moderatorNote?: string;
      reviewedBy?: string;
    }) =>
      updateReport(reportId, {
        status,
        moderatorNote,
        reviewedBy,
        reviewedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
};

export const useGetSafetyRelationships = (owner?: string) =>
  useQuery<Models.Document[]>({
    queryKey: [QUERY_KEYS.GET_SAFETY_RELATIONSHIPS, owner],
    queryFn: () => getSafetyRelationships(owner || ""),
    enabled: !!owner,
  });

export const useSetSafetyRelationship = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      owner,
      target,
      type,
      existingId,
      ownerAccountId,
    }: {
      owner: string;
      target: string;
      type: "block" | "mute";
      existingId?: string;
      ownerAccountId?: string;
    }) =>
      setSafetyRelationship(owner, target, type, existingId, ownerAccountId),
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_SAFETY_RELATIONSHIPS, variables.owner],
      }),
  });
};

export const useGetDrafts = (owner?: string) =>
  useQuery<Models.Document[]>({
    queryKey: [QUERY_KEYS.GET_DRAFTS, owner],
    queryFn: () => getDrafts(owner || ""),
    enabled: !!owner,
  });

export const useSaveDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      owner,
      draft,
      draftId,
      ownerAccountId,
    }: {
      owner: string;
      draft: {
        caption: string;
        location: string;
        tags: string;
        imageId?: string;
        imageUrl?: string;
      };
      draftId?: string;
      ownerAccountId?: string;
    }) => saveDraft(owner, draft, draftId, ownerAccountId),
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_DRAFTS, variables.owner],
      }),
  });
};

export const useDeleteDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDraft,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_DRAFTS] }),
  });
};

export const useGetNotificationPreferences = (owner?: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.GET_PREFERENCES, owner],
    queryFn: () => getNotificationPreferences(owner || ""),
    enabled: !!owner,
  });

export const useSaveNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      owner,
      accountId,
      preferences,
      preferenceId,
    }: {
      owner: string;
      accountId: string;
      preferences: {
        likes: boolean;
        comments: boolean;
        follows: boolean;
        saves: boolean;
      };
      preferenceId?: string;
    }) =>
      saveNotificationPreferences(owner, accountId, preferences, preferenceId),
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_PREFERENCES, variables.owner],
      }),
  });
};

export const useGetMessages = (userId?: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.GET_MESSAGES, userId],
    queryFn: () => getMessagesForUser(userId || ""),
    enabled: !!userId,
  });

export const useGetUnreadMessageCount = (userId?: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.GET_UNREAD_MESSAGES, userId],
    queryFn: () => getUnreadMessageCount(userId || ""),
    enabled: !!userId,
    refetchInterval: 30000,
  });

export const useCreateMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sender,
      senderAccountId,
      recipient,
      recipientAccountId,
      content,
      attachment,
    }: {
      sender: string;
      senderAccountId: string;
      recipient: string;
      recipientAccountId: string;
      content: string;
      attachment?: { id: string; url: string };
    }) =>
      createMessage(
        sender,
        senderAccountId,
        recipient,
        recipientAccountId,
        content,
        attachment
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_MESSAGES, variables.sender],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_MESSAGES, variables.recipient],
      });
    },
  });
};

export const useUpdateMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, senderProfileId, content }: { messageId: string; senderProfileId: string; content: string }) =>
      updateMessage(messageId, senderProfileId, content),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_MESSAGES] }),
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, senderProfileId }: { messageId: string; senderProfileId: string }) =>
      deleteMessage(messageId, senderProfileId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_MESSAGES] }),
  });
};

export const useMarkMessageRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markMessageRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_MESSAGES] }),
  });
};

export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipient: string) => markNotificationsRead(recipient),
    onSuccess: (_, recipient) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_NOTIFICATIONS, recipient],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_UNREAD_NOTIFICATIONS, recipient],
      });
    },
  });
};

export const useGetFollowRelationship = (
  follower?: string,
  following?: string
) =>
  useQuery({
    queryKey: [QUERY_KEYS.GET_FOLLOW_RELATIONSHIP, follower, following],
    queryFn: () => getFollowRelationship(follower || "", following || ""),
    enabled: !!follower && !!following && follower !== following,
  });

export const useGetFollowCounts = (userId?: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.GET_FOLLOW_COUNTS, userId],
    queryFn: () => getFollowCounts(userId || ""),
    enabled: !!userId,
  });

export const useCreateFollow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      follower,
      following,
      followerAccountId,
    }: {
      follower: string;
      following: string;
      followerAccountId: string;
    }) => createFollow(follower, following, followerAccountId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          QUERY_KEYS.GET_FOLLOW_RELATIONSHIP,
          variables.follower,
          variables.following,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_FOLLOW_COUNTS, variables.following],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_FOLLOW_COUNTS, variables.follower],
      });
    },
  });
};

export const useDeleteFollow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ followId }: {
      followId: string;
      follower: string;
      following: string;
    }) => deleteFollow(followId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          QUERY_KEYS.GET_FOLLOW_RELATIONSHIP,
          variables.follower,
          variables.following,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_FOLLOW_COUNTS, variables.following],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_FOLLOW_COUNTS, variables.follower],
      });
    },
  });
};

export const useGetComments = (postId?: string) =>
  useQuery({
    queryKey: [QUERY_KEYS.GET_COMMENTS, postId],
    queryFn: () => getComments(postId || ""),
    enabled: !!postId,
  });

export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      authorId,
      content,
      authorAccountId,
    }: {
      postId: string;
      authorId: string;
      content: string;
      authorAccountId: string;
    }) => createComment(postId, authorId, content, authorAccountId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_COMMENTS, variables.postId],
      });
    },
  });
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      content,
      authorAccountId,
    }: {
      commentId: string;
      content: string;
      authorAccountId: string;
      postId: string;
    }) => updateComment(commentId, content, authorAccountId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_COMMENTS, variables.postId],
      });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      accountId,
    }: {
      commentId: string;
      accountId: string;
    }) => deleteComment(commentId, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_COMMENTS],
      });
    },
  });
};

// ============================================================
// USER QUERIES
// ============================================================

export const useGetCurrentUser = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_CURRENT_USER],
    queryFn: getCurrentUser,
  });
};

export const useGetUsers = (limit?: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_USERS],
    queryFn: () => getUsers(limit),
  });
};

export const useGetUserById = (userId: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GET_USER_BY_ID, userId],
    queryFn: () => getUserById(userId),
    enabled: !!userId,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user: IUpdateUser) => updateUser(user),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_CURRENT_USER],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_USER_BY_ID, data?.$id],
      });
    },
  });
};
