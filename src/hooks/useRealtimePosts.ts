import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Models } from "appwrite";

import { useUserContext } from "@/context/AuthContext";
import { client, appwriteConfig, isAppwriteConfigured } from "@/lib/appwrite/config";
import { QUERY_KEYS } from "@/lib/react-query/queryKeys";

export const useRealtimePosts = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useUserContext();

  useEffect(() => {
    if (!isAuthenticated || !isAppwriteConfigured) return;

    const channel = `collections.${appwriteConfig.postCollectionId}.documents`;

    try {
      const unsubscribe = client.subscribe<Models.Document>(
        channel,
        () => {
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
            queryKey: [QUERY_KEYS.GET_POST_BY_ID],
          });
          queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.GET_USER_POSTS],
          });
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Unable to subscribe to realtime post updates.", error);
    }
  }, [isAuthenticated, queryClient]);
};
