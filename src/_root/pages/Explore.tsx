import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";

import { Input } from "@/components/ui";
import useDebounce from "@/hooks/useDebounce";
import { GridPostList, Loader, UserCard } from "@/components/shared";
import {
  useGetPosts,
  useSearchPosts,
  useSearchUsers,
} from "@/lib/react-query/queries";
import { Models } from "appwrite";
import { useClientPreferences } from "@/hooks/useClientPreferences";

export type SearchResultProps = {
  isSearchFetching: boolean;
  searchedPosts?: Models.DocumentList<Models.Document>;
  isSearchError: boolean;
  refetchSearch: () => void;
};

const SearchResults = ({
  isSearchFetching,
  searchedPosts,
  isSearchError,
  refetchSearch,
}: SearchResultProps) => {
  if (isSearchFetching) {
    return <Loader />;
  } else if (isSearchError) {
    return (
      <div className="w-full text-center">
        <p className="text-light-4">Search failed. Please try again.</p>
        <button
          type="button"
          className="text-primary-500 small-semibold mt-3"
          onClick={refetchSearch}>
          Try again
        </button>
      </div>
    );
  } else if (searchedPosts && searchedPosts.documents.length > 0) {
    return <GridPostList posts={searchedPosts.documents} />;
  } else {
    return (
      <p className="text-light-4 mt-10 text-center w-full">No results found</p>
    );
  }
};

const Explore = () => {
  const { ref, inView } = useInView();
  const { blockedUserIds, mutedUserIds } = useClientPreferences();
  const {
    data: posts,
    fetchNextPage,
    hasNextPage,
    isLoading: isPostsLoading,
    isError: isPostsError,
    refetch: refetchPosts,
  } = useGetPosts();

  const [searchValue, setSearchValue] = useState("");
  const [filter, setFilter] = useState<"all" | "recent">("all");
  const debouncedSearch = useDebounce(searchValue, 500);
  const {
    data: searchedPosts,
    isFetching: isSearchFetching,
    isError: isSearchError,
    refetch: refetchSearch,
  } = useSearchPosts(debouncedSearch);
  const { data: searchedUsers } = useSearchUsers(debouncedSearch);
  const visibleSearchedUsers =
    searchedUsers?.documents.filter(
      (candidate: Models.Document) =>
      !blockedUserIds.includes(candidate.$id) &&
      !mutedUserIds.includes(candidate.$id)
    ) || [];

  useEffect(() => {
    if (inView && !searchValue) {
      fetchNextPage();
    }
  }, [inView, searchValue]);

  if (isPostsLoading && !posts)
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );

  if (isPostsError) {
    return (
      <div className="flex-center h-full w-full flex-col">
        <p className="text-light-4">We couldn&apos;t load Explore.</p>
        <button
          type="button"
          className="text-primary-500 small-semibold mt-3"
          onClick={() => refetchPosts()}>
          Try again
        </button>
      </div>
    );
  }

  const shouldShowSearchResults = searchValue !== "";
  const hiddenUserIds = new Set([...blockedUserIds, ...mutedUserIds]);
  const visiblePages =
    filter === "recent"
      ? posts.pages.map((page) => ({
          ...page,
          documents: [...page.documents]
            .filter((post) => !hiddenUserIds.has(post.creator?.$id))
            .sort((a, b) => b.$createdAt.localeCompare(a.$createdAt)),
        }))
      : posts.pages.map((page) => ({
          ...page,
          documents: page.documents.filter(
            (post) => !hiddenUserIds.has(post.creator?.$id)
          ),
        }));
  const shouldShowPosts =
    !shouldShowSearchResults &&
    posts.pages.every((item) => item.documents.length === 0);

  return (
    <div className="explore-container">
      <div className="explore-inner_container">
        <div className="w-full">
          <p className="eyebrow">EXPLORE THE COMMUNITY</p>
          <h2 className="h3-bold md:h2-bold w-full mt-2">Find your next idea</h2>
          <p className="small-regular text-light-3 mt-2">
            Search posts, discover creators, and save what inspires you.
          </p>
        </div>
        <div className="flex gap-1 px-4 w-full rounded-lg bg-dark-4">
          <img
            src="/assets/icons/search.svg"
            width={24}
            height={24}
            alt="search"
          />
          <Input
            type="text"
            placeholder="Search"
            className="explore-search"
            value={searchValue}
            onChange={(e) => {
              const { value } = e.target;
              setSearchValue(value);
            }}
          />
        </div>
      </div>

      <div className="flex-between w-full max-w-5xl mt-16 mb-7">
        <h3 className="body-bold md:h3-bold">Popular Today</h3>

        <div className="flex-center gap-3 bg-dark-3 rounded-xl px-4 py-2 cursor-pointer">
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as "all" | "recent")
            }
            className="bg-transparent text-light-2 outline-none">
            <option value="all">All</option>
            <option value="recent">Recent</option>
          </select>
          <img
            src="/assets/icons/filter.svg"
            width={20}
            height={20}
            alt="filter"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-9 w-full max-w-5xl">
        {shouldShowSearchResults ? (
          <>
            {visibleSearchedUsers.length ? (
              <div className="w-full">
                <h3 className="body-bold mb-4">Creators</h3>
                <ul className="grid gap-4 md:grid-cols-3">
                  {visibleSearchedUsers.map((creator: Models.Document) => (
                    <li key={creator.$id}>
                      <UserCard user={creator} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <SearchResults
              isSearchFetching={isSearchFetching}
              searchedPosts={searchedPosts}
              isSearchError={isSearchError}
              refetchSearch={refetchSearch}
            />
          </>
        ) : shouldShowPosts ? (
          <p className="text-light-4 mt-10 text-center w-full">End of posts</p>
        ) : (
          visiblePages.map((item, index) => (
            <GridPostList key={`page-${index}`} posts={item.documents} />
          ))
        )}
      </div>

      {hasNextPage && !searchValue && (
        <div ref={ref} className="mt-10">
          <Loader />
        </div>
      )}
    </div>
  );
};

export default Explore;
