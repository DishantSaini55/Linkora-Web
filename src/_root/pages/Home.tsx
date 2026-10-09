import { Models } from "appwrite";

// import { useToast } from "@/components/ui/use-toast";
import { Loader, PostCard, UserCard } from "@/components/shared";
import { useGetRecentPosts, useGetUsers } from "@/lib/react-query/queries";
import { useClientPreferences } from "@/hooks/useClientPreferences";

const Home = () => {
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
  const hiddenUserIds = new Set([...blockedUserIds, ...mutedUserIds]);
  const visiblePosts = posts?.documents.filter(
    (post) => !hiddenUserIds.has(post.creator?.$id)
  );

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
