import { useMemo, useState } from "react";
import { Models } from "appwrite";

// import { useToast } from "@/components/ui/use-toast";
import { Loader, PostCard, UserCard } from "@/components/shared";
import {
  useGetFollowingProfileIds,
  useGetRecentPosts,
  useGetUsers,
} from "@/lib/react-query/queries";
import { useUserContext } from "@/context/AuthContext";
import { useClientPreferences } from "@/hooks/useClientPreferences";

const Home = () => {
  const { user } = useUserContext();
  const [feedMode, setFeedMode] = useState<"latest" | "popular" | "following">(
    "latest"
  );
  // const { toast } = useToast();

  const {
    data: posts,
    isLoading: isPostLoading,
    isError: isErrorPosts,
    refetch: refetchPosts,
  } = useGetRecentPosts();
  const {
    data: creators,
    isLoading: isUserLoading,
    isError: isErrorCreators,
    refetch: refetchCreators,
  } = useGetUsers(10);
  const { blockedUserIds, mutedUserIds } = useClientPreferences();
  const { data: followingProfileIds = [] } = useGetFollowingProfileIds(user.id);
  const hiddenUserIds = new Set([...blockedUserIds, ...mutedUserIds]);
  const visiblePosts = useMemo(() => {
    const filtered = (posts?.documents || []).filter(
      (post) => !hiddenUserIds.has(post.creator?.$id)
    );
    if (feedMode === "following") {
      return filtered.filter((post) =>
        followingProfileIds.includes(post.creator?.$id)
      );
    }
    if (feedMode === "popular") {
      return [...filtered].sort(
        (left, right) =>
          (Array.isArray(right.likes) ? right.likes.length : 0) -
          (Array.isArray(left.likes) ? left.likes.length : 0)
      );
    }
    return filtered;
  }, [feedMode, followingProfileIds, hiddenUserIds, posts?.documents]);

  if (isErrorPosts || isErrorCreators) {
    return (
      <div className="flex flex-1">
        <div className="home-container">
          <p className="body-medium text-light-1">
            We couldn&apos;t load your home feed.
          </p>
          <button
            type="button"
            className="text-primary-500 small-semibold mt-3"
            onClick={() => refetchPosts()}>
            Try again
          </button>
        </div>
        <div className="home-creators">
          <p className="body-medium text-light-1">
            We couldn&apos;t load creators.
          </p>
          <button
            type="button"
            className="text-primary-500 small-semibold mt-3"
            onClick={() => refetchCreators()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <div className="home-container">
        <div className="home-posts">
          <div className="w-full">
            <p className="eyebrow">YOUR DAILY CREATIVE FEED</p>
            <h2 className="h3-bold md:h2-bold text-left w-full mt-2">
              Discover something new
            </h2>
            <p className="small-regular text-light-3 mt-2">
              Fresh ideas and creators, all in one place.
            </p>
            <div className="flex gap-2 mt-4" role="group" aria-label="Feed mode">
              {(["latest", "popular", "following"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFeedMode(mode)}
                  className={`small-semibold rounded-full px-4 py-2 ${
                    feedMode === mode
                      ? "bg-primary-500 text-white"
                      : "bg-light-2 text-light-3"
                  }`}>
                  {mode[0].toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {isPostLoading && !posts ? (
            <Loader />
          ) : visiblePosts?.length === 0 ? (
            <p className="text-light-4 mt-10 text-center">
              No posts yet. Create the first one!
            </p>
          ) : (
            <ul className="flex flex-col flex-1 gap-9 w-full ">
              {visiblePosts?.map((post: Models.Document) => (
                <li key={post.$id} className="flex justify-center w-full">
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="home-creators">
        <h3 className="h3-bold text-light-1">Top Creators</h3>
        {isUserLoading && !creators ? (
          <Loader />
        ) : creators?.documents.length === 0 ? (
          <p className="text-light-4 mt-10 text-center">
            No creators to show yet.
          </p>
        ) : (
          <ul className="grid 2xl:grid-cols-2 gap-6">
            {creators?.documents.map((creator) => (
              <li key={creator?.$id}>
                <UserCard user={creator} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Home;
