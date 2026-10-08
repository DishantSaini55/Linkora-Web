import { Models } from "appwrite";
import { Link } from "react-router-dom";
import { useUserContext } from "@/context/AuthContext";
import {
  useCreateFollow,
  useCreateNotification,
  useDeleteFollow,
  useGetFollowRelationship,
} from "@/lib/react-query/queries";
import { useToast } from "@/components/ui/use-toast";

import { Button } from "../ui/button";

type UserCardProps = {
  user: Models.Document;
};

const UserCard = ({ user }: UserCardProps) => {
  const { user: currentUser } = useUserContext();
  const { toast } = useToast();
  const { data: follow } = useGetFollowRelationship(
    currentUser.id,
    user.$id
  );
  const { mutate: createFollow, isLoading: isCreating } = useCreateFollow();
  const { mutate: createNotification } = useCreateNotification();
  const { mutate: deleteFollow, isLoading: isDeleting } = useDeleteFollow();
  const isFollowing = !!follow;
  const isBusy = isCreating || isDeleting;

  const handleFollow = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (isBusy) return;

    if (follow) {
      deleteFollow(
        { followId: follow.$id, follower: currentUser.id, following: user.$id },
        {
          onSuccess: () =>
            createNotification({
              recipient: user.accountId,
              actor: currentUser.accountId,
              type: "follow",
              post: "",
            }),
          onError: (error) =>
            toast({
              title: "Unfollow failed",
              description:
                error instanceof Error ? error.message : "Please try again.",
              variant: "destructive",
            }),
        }
      );
      return;
    }

    createFollow(
      {
        follower: currentUser.id,
        following: user.$id,
        followerAccountId: currentUser.accountId,
      },
      {
        onError: (error) =>
          toast({
            title: "Follow failed",
            description:
              error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <Link to={`/profile/${user.$id}`} className="user-card">
      <img
        src={user.imageUrl || "/assets/icons/profile-placeholder.svg"}
        alt="creator"
        className="rounded-full w-14 h-14"
      />

      <div className="flex-center flex-col gap-1">
        <p className="base-medium text-light-1 text-center line-clamp-1">
          {user.name}
        </p>
        <p className="small-regular text-light-3 text-center line-clamp-1">
          @{user.username}
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        className="shad-button_primary px-5"
        disabled={isBusy}
        onClick={handleFollow}>
        {isFollowing ? "Following" : "Follow"}
      </Button>
    </Link>
  );
};

export default UserCard;
