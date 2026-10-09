import { useEffect, useMemo, useState } from "react";

import { Loader } from "@/components/shared";
import { useUserContext } from "@/context/AuthContext";
import { useGetUserPosts } from "@/lib/react-query/queries";
import { getComments } from "@/lib/appwrite/api";

const Analytics = () => {
  const { user } = useUserContext();
  const { data, isLoading, isError } = useGetUserPosts(user.id);
  const posts = data?.documents || [];
  const [commentCount, setCommentCount] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all(posts.map((post) => getComments(post.$id)))
      .then((commentLists) => {
        if (active) setCommentCount(commentLists.reduce((sum, list) => sum + list.length, 0));
      })
      .catch(() => {
        if (active) setCommentCount(0);
      });
    return () => {
      active = false;
    };
  }, [posts]);
  const metrics = useMemo(
    () => ({
      posts: posts.length,
      likes: posts.reduce(
        (total, post) => total + (Array.isArray(post.likes) ? post.likes.length : 0),
        0
      ),
      saves: posts.reduce(
        (total, post) => total + (Array.isArray(post.saves) ? post.saves.length : 0),
        0
      ),
      topPost: [...posts].sort(
        (a, b) =>
          (Array.isArray(b.likes) ? b.likes.length : 0) -
          (Array.isArray(a.likes) ? a.likes.length : 0)
      )[0],
      comments: commentCount,
    }),
    [commentCount, posts]
  );

  return (
    <div className="common-container">
      <div className="w-full max-w-5xl">
        <p className="eyebrow">CREATOR TOOLS</p>
        <h1 className="h2-bold mt-2">Analytics</h1>
        <p className="text-light-3 mt-2">
          Understand how your published posts are performing.
        </p>
      </div>
      {isLoading ? (
        <Loader />
      ) : isError ? (
        <p className="text-light-3">Analytics could not be loaded.</p>
      ) : (
        <>
          <div className="w-full max-w-5xl grid grid-cols-2 gap-4 md:grid-cols-3">
            {[
              ["Posts", metrics.posts],
              ["Likes", metrics.likes],
              ["Saves", metrics.saves],
              ["Comments", metrics.comments],
            ].map(([label, value]) => (
              <div key={label} className="settings-card">
                <p className="small-regular text-light-3">{label}</p>
                <p className="h2-bold text-primary-400 mt-2">{value}</p>
              </div>
            ))}
          </div>
          <div className="settings-card w-full max-w-5xl">
            <p className="small-semibold text-light-3">Top post</p>
            <p className="body-medium mt-2">
              {metrics.topPost?.caption || "Publish a post to see performance."}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
