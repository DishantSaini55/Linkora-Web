import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import { Button, Textarea } from "@/components/ui";
import { GridPostList, Loader, PostStats } from "@/components/shared";

import {
  useGetPostById,
  useGetUserPosts,
  useDeletePost,
  useGetComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useGetUsers,
  useCreateNotification,
  useCreateReport,
} from "@/lib/react-query/queries";
import { multiFormatDateString } from "@/lib/utils";
import { useUserContext } from "@/context/AuthContext";
import { getFilePreview } from "@/lib/appwrite/api";
import { useToast } from "@/components/ui/use-toast";

const PostDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useUserContext();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const { mutate: createNotification } = useCreateNotification();
  const { mutate: createReport, isLoading: isCreatingReport } =
    useCreateReport();

  const {
    data: post,
    isLoading,
    isError: isPostError,
    refetch: refetchPost,
  } = useGetPostById(id);
  const {
    data: userPosts,
    isLoading: isUserPostLoading,
    isError: isUserPostsError,
    refetch: refetchUserPosts,
  } = useGetUserPosts(post?.creator.$id);
  const { mutate: deletePost } = useDeletePost();
  const { data: comments, isLoading: isCommentsLoading } = useGetComments(id);
  const { data: users } = useGetUsers();
  const { mutate: createComment, isLoading: isCreatingComment } =
    useCreateComment();
  const { mutate: updateComment, isLoading: isUpdatingComment } =
    useUpdateComment();
  const { mutate: deleteComment, isLoading: isDeletingComment } =
    useDeleteComment();

  const relatedPosts = userPosts?.documents.filter(
    (userPost) => userPost.$id !== id
  );

  const handleDeletePost = () => {
    deletePost({ postId: id, imageId: post?.imageid });
    navigate(-1);
  };

  const handleCreateComment = () => {
    const content = comment.trim();
    if (!id || !content || isCreatingComment) return;

    createComment(
      {
        postId: id,
        authorId: user.id,
        authorAccountId: user.accountId,
        content,
      },
      {
        onSuccess: () => {
          setComment("");
          if (
            localStorage.getItem("linkora:notify-comments") !== "false" &&
            post?.creator.accountId &&
            post.creator.accountId !== user.accountId
          ) {
            createNotification({
              recipient: post.creator.accountId,
              actor: user.accountId,
              type: "comment",
              post: id,
            });
          }
        },
        onError: (error) =>
          toast({
            title: "Comment failed",
            description:
              error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          }),
      }
    );
  };

  const handleReport = (targetType: "post" | "comment", targetId: string) => {
    if (isCreatingReport) return;

    const reason = window
      .prompt(
        `Why are you reporting this ${targetType === "post" ? "post" : "comment"}?`
      )
      ?.trim();
    if (!reason) return;

    createReport(
      { reporter: user.accountId, targetType, targetId, reason },
      {
        onSuccess: () =>
          toast({
            title: "Report submitted",
            description: "Thank you. We will review this report.",
          }),
        onError: (error) =>
          toast({
            title: "Report failed",
            description:
              error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          }),
      }
    );
  };

  const handleShare = async () => {
    if (!post) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.caption, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied",
          description: "The post link is ready to share.",
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast({
        title: "Share failed",
        description: "The post link could not be shared.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateComment = (commentId: string) => {
    const content = editingContent.trim();
    if (!content || isUpdatingComment) return;

    updateComment(
      { commentId, content, postId: id || "" },
      {
        onSuccess: () => {
          setEditingCommentId(null);
          setEditingContent("");
        },
        onError: (error) =>
          toast({
            title: "Comment update failed",
            description:
              error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <div className="post_details-container">
      <div className="hidden md:flex max-w-5xl w-full">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="shad-button_ghost">
          <img
            src={"/assets/icons/back.svg"}
            alt="back"
            width={24}
            height={24}
          />
          <p className="small-medium lg:base-medium">Back</p>
        </Button>
        <Button
          onClick={() => post && handleReport("post", post.$id)}
          variant="ghost"
          disabled={isCreatingReport}
          className="text-light-3">
          Report
        </Button>
        <Button onClick={handleShare} variant="ghost" className="text-light-3">
          Share
        </Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : isPostError || !post ? (
        <div className="flex-center flex-col py-10">
          <p className="text-light-4">We couldn&apos;t load this post.</p>
          <button
            type="button"
            className="text-primary-500 small-semibold mt-3"
            onClick={() => refetchPost()}>
            Try again
          </button>
        </div>
      ) : (
        <div className="post_details-card">
          <img
            src={
              post?.imageId
                ? getFilePreview(post.imageId).toString()
                : post?.imageUrl
            }
            alt="creator"
            className="post_details-img"
          />

          <div className="post_details-info">
            <div className="flex-between w-full">
              <Link
                to={`/profile/${post?.creator.$id}`}
                className="flex items-center gap-3">
                <img
                  src={
                    post?.creator.imageUrl ||
                    "/assets/icons/profile-placeholder.svg"
                  }
                  alt="creator"
                  className="w-8 h-8 lg:w-12 lg:h-12 rounded-full"
                />
                <div className="flex gap-1 flex-col">
                  <p className="base-medium lg:body-bold text-light-1">
                    {post?.creator.name}
                  </p>
                  <div className="flex-center gap-2 text-light-3">
                    <p className="subtle-semibold lg:small-regular ">
                      {multiFormatDateString(post?.$createdAt)}
                    </p>
                    •
                    <p className="subtle-semibold lg:small-regular">
                      {post?.location}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="flex-center gap-4">
                <Link
                  to={`/update-post/${post?.$id}`}
                  className={`${user.id !== post?.creator.$id && "hidden"}`}>
                  <img
                    src={"/assets/icons/edit.svg"}
                    alt="edit"
                    width={24}
                    height={24}
                  />
                </Link>

                <Button
                  onClick={handleDeletePost}
                  variant="ghost"
                  className={`ost_details-delete_btn ${
                    user.id !== post?.creator.$id && "hidden"
                  }`}>
                  <img
                    src={"/assets/icons/delete.svg"}
                    alt="delete"
                    width={24}
                    height={24}
                  />
                </Button>
              </div>
            </div>

            <hr className="border w-full border-dark-4/80" />

            <div className="flex flex-col flex-1 w-full small-medium lg:base-regular">
              <p>{post?.caption}</p>
              <ul className="flex gap-1 mt-2">
                {(Array.isArray(post?.tags) ? post.tags : []).map(
                  (tag: string, index: number) => (
                  <li
                    key={`${tag}${index}`}
                    className="text-light-3 small-regular">
                    #{tag}
                  </li>
                  )
                )}
              </ul>
            </div>

            <div className="w-full">
              <PostStats post={post} userId={user.id} />
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl">
        <section className="mt-10 w-full">
          <h3 className="body-bold md:h3-bold">Comments</h3>
          <div className="mt-5 flex gap-3">
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Write a comment..."
              className="shad-textarea min-h-[90px]"
              maxLength={500}
              disabled={isCreatingComment}
            />
            <Button
              type="button"
              className="shad-button_primary self-end"
              onClick={handleCreateComment}
              disabled={!comment.trim() || isCreatingComment}>
              {isCreatingComment ? "Posting..." : "Post"}
            </Button>
          </div>
          {isCommentsLoading ? (
            <Loader />
          ) : comments?.length ? (
            <ul className="mt-6 flex flex-col gap-4">
              {comments.map((item) => {
                const author = users?.documents.find(
                  (candidate) => candidate.$id === item.author
                );

                return (
                  <li key={item.$id} className="rounded-lg bg-dark-4 p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          author?.imageUrl ||
                          "/assets/icons/profile-placeholder.svg"
                        }
                        alt={author?.name || "Comment author"}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                      <div>
                        <p className="small-semibold">
                          {author?.name || "User"}
                        </p>
                        <p className="subtle-regular text-light-3">
                          {multiFormatDateString(item.$createdAt)}
                        </p>
                      </div>
                    </div>
                    {editingCommentId === item.$id ? (
                      <div className="mt-3 flex gap-2">
                        <Textarea
                          value={editingContent}
                          onChange={(event) =>
                            setEditingContent(event.target.value)
                          }
                          maxLength={500}
                          className="shad-textarea"
                        />
                        <Button
                          type="button"
                          className="shad-button_primary"
                          onClick={() => handleUpdateComment(item.$id)}
                          disabled={
                            !editingContent.trim() || isUpdatingComment
                          }>
                          Save
                        </Button>
                      </div>
                    ) : (
                      <p className="body-regular mt-3">{item.content}</p>
                    )}
                    {author?.$id === user.id && editingCommentId !== item.$id ? (
                      <div className="mt-3 flex gap-3">
                        <button
                          type="button"
                          className="small-semibold text-primary-500"
                          onClick={() => {
                            setEditingCommentId(item.$id);
                            setEditingContent(item.content);
                          }}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="small-semibold text-red-400"
                          disabled={isDeletingComment}
                          onClick={() =>
                            deleteComment(item.$id, {
                              onError: (error) =>
                                toast({
                                  title: "Comment deletion failed",
                                  description:
                                    error instanceof Error
                                      ? error.message
                                      : "Please try again.",
                                  variant: "destructive",
                                }),
                            })
                          }>
                          Delete
                        </button>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="small-semibold text-light-3 mt-3"
                      disabled={isCreatingReport}
                      onClick={() => handleReport("comment", item.$id)}>
                      Report
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-light-4 mt-5">No comments yet.</p>
          )}
        </section>

        <hr className="border w-full border-dark-4/80" />

        <h3 className="body-bold md:h3-bold w-full my-10">
          More Related Posts
        </h3>
        {isUserPostLoading ? (
          <Loader />
        ) : isUserPostsError ? (
          <div className="text-center">
            <p className="text-light-4">Related posts couldn&apos;t load.</p>
            <button
              type="button"
              className="text-primary-500 small-semibold mt-3"
              onClick={() => refetchUserPosts()}>
              Try again
            </button>
          </div>
        ) : relatedPosts?.length ? (
          <GridPostList posts={relatedPosts} />
        ) : (
          <p className="text-light-4 text-center">No other posts yet.</p>
        )}
      </div>
    </div>
  );
};

export default PostDetails;
