import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../ui/button";
import { useUserContext } from "@/context/AuthContext";
import {
  useGetUnreadNotificationCount,
  useSignOutAccount,
} from "@/lib/react-query/queries";
import { useToast } from "@/components/ui/use-toast";

const Topbar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, setIsAuthenticated } = useUserContext();
  const { mutate: signOut, isSuccess } = useSignOutAccount();
  const { data: unreadCount } = useGetUnreadNotificationCount(user.accountId);

  useEffect(() => {
    if (isSuccess) {
      setIsAuthenticated(false);
      navigate("/sign-in", { replace: true });
    }
  }, [isSuccess, navigate, setIsAuthenticated]);

  const handleSignOut = () => {
    signOut(undefined, {
      onError: (error) => {
        toast({
          title: "Logout failed",
          description:
            error instanceof Error
              ? error.message
              : "Unable to end your session. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <section className="topbar">
      <div className="flex-between py-4 px-5">
        <Link to="/" className="flex gap-3 items-center">
          <img
            src="/assets/images/logo.svg"
            alt="logo"
            width={130}
            height={325}
          />
        </Link>

        <div className="flex gap-4">
          <Link to="/notifications" className="relative flex-center">
            <img src="/assets/icons/chat.svg" alt="notifications" />
            {unreadCount ? (
              <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-1.5 text-xs text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
          <Button
            variant="ghost"
            className="shad-button_ghost"
            onClick={handleSignOut}>
            <img src="/assets/icons/logout.svg" alt="logout" />
          </Button>
          <Link to={`/profile/${user.id}`} className="flex-center gap-3">
            <img
              src={user.imageUrl || "/assets/icons/profile-placeholder.svg"}
              alt="profile"
              className="h-8 w-8 rounded-full"
            />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Topbar;
