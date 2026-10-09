import { Models } from "appwrite";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useUserContext } from "@/context/AuthContext";
import {
  useCreateFollow,
  useCreateNotification,
  useDeleteFollow,
  useGetFollowRelationship,
  useSetSafetyRelationship,
  useGetSafetyRelationships,
} from "@/lib/react-query/queries";
import { useToast } from "@/components/ui/use-toast";

import { Button } from "../ui/button";
import {
  isUserBlocked,
  isUserMuted,
  toggleBlockedUser,
  toggleMutedUser,
} from "@/lib/clientPreferences";
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
  const { data: safetyRelationships = [] } = useGetSafetyRelationships(
    currentUser.id
  );
  const { mutate: updateSafety } = useSetSafetyRelationship();
  const { mutate: deleteFollow, isLoading: isDeleting } = useDeleteFollow();
  const isFollowing = !!follow;
  const isBusy = isCreating || isDeleting;
  const [blocked, setBlocked] = useState(() => isUserBlocked(user.$id));
  const [muted, setMuted] = useState(() => isUserMuted(user.$id));

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

  const handlePreference = (
    event: React.MouseEvent<HTMLButtonElement>,
    preference: "block" | "mute"
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (preference === "block") {
      toggleBlockedUser(user.$id);
      setBlocked((current) => !current);
    } else {
      toggleMutedUser(user.$id);
      setMuted((current) => !current);
    }
    const type = preference === "block" ? "block" : "mute";
    const existing = safetyRelationships.find(
      (relationship) =>
        relationship.target === user.$id && relationship.type === type
    );
    updateSafety({
      owner: currentUser.id,
      target: user.$id,
      type,
      existingId: existing?.$id,
    });
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

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          className="shad-button_primary px-5"
          disabled={isBusy}
          onClick={handleFollow}>
          {isFollowing ? "Following" : "Follow"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={`${blocked ? "Unblock" : "Block"} ${user.name}`}
          onClick={(event) => handlePreference(event, "block")}>
          {blocked ? "Unblock" : "Block"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={`${muted ? "Unmute" : "Mute"} ${user.name}`}
          onClick={(event) => handlePreference(event, "mute")}>
          {muted ? "Unmute" : "Mute"}
        </Button>
      </div>
    </Link>
  );
};

export default UserCard;
