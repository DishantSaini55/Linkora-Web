import { Link } from "react-router-dom";

import { Loader } from "@/components/shared";
import { useUserContext } from "@/context/AuthContext";
import { useGetNotifications } from "@/lib/react-query/queries";

const Notifications = () => {
  const { user } = useUserContext();
  const { data: notifications, isLoading, isError, refetch } =
    useGetNotifications(user.id);

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
            <li
              key={notification.$id}
              className="flex items-center gap-3 rounded-lg bg-dark-4 p-4">
              <p className="body-medium">
                Someone {notification.type === "like" ? "liked" : "saved"} your
                post.
              </p>
              <Link
                to={`/posts/${notification.post}`}
                className="text-primary-500 small-semibold">
                View post
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
