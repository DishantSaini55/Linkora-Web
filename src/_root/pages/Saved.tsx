import { Models } from "appwrite";

import { GridPostList, Loader } from "@/components/shared";
import { useGetCurrentUser } from "@/lib/react-query/queries";

const Saved = () => {
  const {
    data: currentUser,
    isLoading,
    isError,
    refetch,
  } = useGetCurrentUser();

  const savePosts = currentUser?.save
    .map((savePost: Models.Document) => ({
      ...savePost.post,
      creator: {
        imageUrl: currentUser.imageUrl,
      },
    }))
    .reverse();

  return (
    <div className="saved-container">
      <div className="flex gap-2 w-full max-w-5xl">
        <img
          src="/assets/icons/save.svg"
          width={36}
          height={36}
          alt="edit"
          className="invert-white"
        />
        <h2 className="h3-bold md:h2-bold text-left w-full">Saved Posts</h2>
      </div>

      {isLoading ? (
        <Loader />
      ) : isError ? (
        <div className="text-center">
          <p className="text-light-4">We couldn&apos;t load saved posts.</p>
          <button
            type="button"
            className="text-primary-500 small-semibold mt-3"
            onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <ul className="w-full flex justify-center max-w-5xl gap-9">
          {savePosts?.length === 0 ? (
            <p className="text-light-4">No available posts</p>
          ) : (
            <GridPostList posts={savePosts} showStats={false} />
          )}
        </ul>
      )}
    </div>
  );
};

export default Saved;
