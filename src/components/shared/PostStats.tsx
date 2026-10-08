import { Models } from "appwrite";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

import { checkIsLiked } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  useLikePost,
  useSavePost,
  useDeleteSavedPost,
  useCreateNotification,
  useGetCurrentUser,
} from "@/lib/react-query/queries";
import { useUserContext } from "@/context/AuthContext";

type PostStatsProps = {
  post: Models.Document;
  userId: string;
};

const PostStats = ({ post, userId }: PostStatsProps) => {
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useUserContext();
  const actorAccountId = user.accountId;
  const likesList = Array.isArray(post.likes)
    ? post.likes.map((user: Models.Document) => user.$id)
    : [];

  const [likes, setLikes] = useState<string[]>(likesList);
  const [isSaved, setIsSaved] = useState(false);

  const { mutate: likePost, isLoading: isLiking } = useLikePost();
  const { mutate: savePost, isLoading: isSaving } = useSavePost();
  const { mutate: deleteSavePost, isLoading: isDeletingSave } =
    useDeleteSavedPost();
  const { mutate: createNotification } = useCreateNotification();

  const { data: currentUser } = useGetCurrentUser();

  const savedPostRecord = currentUser?.save.find(
    (record: Models.Document) => record.post.$id === post.$id
  );
  const creatorAccountId = post.creator.accountId;

  useEffect(() => {
    setIsSaved(!!savedPostRecord);
  }, [currentUser]);

  const handleLikePost = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>
  ) => {
    e.stopPropagation();
    if (isLiking) return;

    let likesArray = [...likes];

    if (likesArray.includes(userId)) {
      likesArray = likesArray.filter((Id) => Id !== userId);
    } else {
      likesArray.push(userId);
    }

    const previousLikes = likes;
    setLikes(likesArray);
    likePost(
      { postId: post.$id, likesArray },
      {
        onSuccess: () => {
          if (creatorAccountId && actorAccountId && creatorAccountId !== actorAccountId) {
            createNotification(
              {
                recipient: creatorAccountId,
                actor: actorAccountId,
                type: "like",
                post: post.$id,
              },
              {
                onError: (error) => {
                  toast({
                    title: "Like notification failed",
                    description:
                      error instanceof Error
                        ? error.message
                        : "Please try again.",
                    variant: "destructive",
                  });
                },
              }
            );
          }
        },
        onError: (error) => {
          setLikes(previousLikes);
          toast({
            title: "Like update failed",
            description:
              error instanceof Error
                ? error.message
                : "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleSavePost = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>
  ) => {
    e.stopPropagation();
    if (isSaving || isDeletingSave) return;

    if (savedPostRecord) {
      setIsSaved(false);
      return deleteSavePost(savedPostRecord.$id, {
        onError: (error) => {
          setIsSaved(true);
          toast({
            title: "Remove saved post failed",
            description:
              error instanceof Error
                ? error.message
                : "Please try again.",
            variant: "destructive",
          });
        },
      });
    }

    savePost(
      { userId, postId: post.$id },
      {
        onSuccess: () => {
          if (creatorAccountId && actorAccountId && creatorAccountId !== actorAccountId) {
            createNotification(
              {
                recipient: creatorAccountId,
                actor: actorAccountId,
                type: "save",
                post: post.$id,
              },
              {
                onError: (error) => {
                  toast({
                    title: "Save notification failed",
                    description:
                      error instanceof Error
                        ? error.message
                        : "Please try again.",
                    variant: "destructive",
                  });
                },
              }
            );
          }
        },
        onError: (error) => {
          setIsSaved(false);
          toast({
            title: "Save post failed",
            description:
              error instanceof Error
                ? error.message
                : "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
    setIsSaved(true);
  };

  const containerStyles = location.pathname.startsWith("/profile")
    ? "w-full"
    : "";

  return (
    <div
      className={`flex justify-between items-center z-20 ${containerStyles}`}>
      <div className="flex gap-2 mr-5">
        <img
          src={`${
            checkIsLiked(likes, userId)
              ? "/assets/icons/liked.svg"
              : "/assets/icons/like.svg"
          }`}
          alt="like"
          width={20}
          height={20}
          onClick={(e) => handleLikePost(e)}
          className={`cursor-pointer ${isLiking ? "opacity-50" : ""}`}
        />
        <p className="small-medium lg:base-medium">{likes.length}</p>
      </div>

      <div className="flex gap-2">
        <img
          src={isSaved ? "/assets/icons/saved.svg" : "/assets/icons/save.svg"}
          alt="share"
          width={20}
          height={20}
          className="cursor-pointer"
          aria-disabled={isSaving || isDeletingSave}
          onClick={(e) => handleSavePost(e)}
        />
      </div>
    </div>
  );
};

export default PostStats;
