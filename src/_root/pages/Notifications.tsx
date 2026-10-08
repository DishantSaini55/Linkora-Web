import { Link } from "react-router-dom";
import { useEffect } from "react";

import { Loader } from "@/components/shared";
import { useUserContext } from "@/context/AuthContext";
import {
  useGetNotifications,
  useGetUsers,
  useMarkNotificationsRead,
} from "@/lib/react-query/queries";

const Notifications = () => {
  const { user } = useUserContext();
  const { data: notifications, isLoading, isError, refetch } =
    useGetNotifications(user.accountId);
  const { data: users } = useGetUsers();
  const { mutate: markNotificationsRead } = useMarkNotificationsRead();

  useEffect(() => {
    if (notifications?.some((notification) => !notification.read)) {
      markNotificationsRead(user.accountId);
    }
  }, [notifications, user.accountId, markNotificationsRead]);

  if (isLoading) {
    return <Loader />;
  }

  if (isError) {
    return (
      <div className="flex-center h-full w-full flex-col">
        <p className="text-light-4">We couldn&apos;t load notifications.</p>
        <button
          type="button"
          className="text-primary-500 small-semibold mt-3"
          onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="common-container">
      <h1 className="h2-bold w-full max-w-5xl">Notifications</h1>
      {!notifications?.length ? (
        <p className="text-light-4 mt-10">No notifications yet.</p>
      ) : (
        <ul className="flex w-full max-w-5xl flex-col gap-4 mt-8">
          {notifications.map((notification) => (
            (() => {
              const actor = users?.documents.find(
                (candidate) => candidate.accountId === notification.actor
              );

              return (
                <li
                  key={notification.$id}
                  className="flex items-center gap-3 rounded-lg bg-dark-4 p-4">
                  {actor ? (
                    <Link to={`/profile/${actor.$id}`}>
                      <img
                        src={
                          actor.imageUrl ||
                          "/assets/icons/profile-placeholder.svg"
                        }
                        alt={actor.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    </Link>
                  ) : null}
                  <p className="body-medium">
                    {actor ? (
                      <Link
                        to={`/profile/${actor.$id}`}
                        className="font-semibold text-light-1">
                        {actor.name}
                      </Link>
                    ) : (
                      "Someone"
                    )}{" "}
                    {notification.type === "like"
                      ? "liked"
                      : notification.type === "save"
                        ? "saved"
                        : notification.type === "follow"
                          ? "started following you."
                          : "commented on"}{" "}
                    {notification.type === "follow" ? "" : "your post."}
                  </p>
                  {notification.post ? (
                    <Link
                      to={`/posts/${notification.post}`}
                      className="ml-auto text-primary-500 small-semibold">
                      View post
                    </Link>
                  ) : null}
                </li>
              );
            })()
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
