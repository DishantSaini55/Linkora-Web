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
    mutationFn: ({ postId, imageId }: { postId?: string; imageId: string }) =>
      deletePost(postId, imageId),
    onSuccess: (_data, variables) => {
      invalidatePostQueries(queryClient, variables.postId);
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
      type: "like" | "save";
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

export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipient: string) => markNotificationsRead(recipient),
    onSuccess: (_, recipient) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.GET_NOTIFICATIONS, recipient],
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
