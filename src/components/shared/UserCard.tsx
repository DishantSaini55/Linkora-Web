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
import { getUserImageUrl } from "@/lib/appwrite/api";

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
        onSuccess: () => {
          if (localStorage.getItem("linkora:notify-follows") !== "false") {
            createNotification({
              recipient: user.accountId,
              actor: currentUser.accountId,
              type: "follow",
              post: "",
            });
          }
        },
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
    updateSafety(
      {
        owner: currentUser.id,
        ownerAccountId: currentUser.accountId,
        target: user.$id,
        type,
        existingId: existing?.$id,
      },
      {
        onError: (error) =>
          toast({
            title: `${preference === "block" ? "Block" : "Mute"} sync failed`,
            description:
              error instanceof Error
                ? error.message
                : "Your local preference was saved, but cloud sync failed.",
            variant: "destructive",
          }),
      }
    );
  };

  return (
    <Link to={`/profile/${user.$id}`} className="user-card">
      <img
        src={getUserImageUrl(user)}
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

      <div className="user-card_actions">
        <Button
          type="button"
          size="sm"
          className="shad-button_primary w-full px-2 text-xs"
          disabled={isBusy}
          onClick={handleFollow}>
          {isFollowing ? "Following" : "Follow"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="user-card_action"
          aria-label={`${blocked ? "Unblock" : "Block"} ${user.name}`}
          onClick={(event) => handlePreference(event, "block")}>
          {blocked ? "Unblock" : "Block"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="user-card_action"
          aria-label={`${muted ? "Unmute" : "Mute"} ${user.name}`}
          onClick={(event) => handlePreference(event, "mute")}>
          {muted ? "Unmute" : "Mute"}
        </Button>
      </div>
    </Link>
  );
};

export default UserCard;
