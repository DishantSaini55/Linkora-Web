import { Navigate, Outlet } from "react-router-dom";

import Topbar from "@/components/shared/Topbar";
import Bottombar from "@/components/shared/Bottombar";
import LeftSidebar from "@/components/shared/LeftSidebar";
import Loader from "@/components/shared/Loader";
import OfflineBanner from "@/components/shared/OfflineBanner";
import { useEffect } from "react";
import { useUserContext } from "@/context/AuthContext";
import { useRealtimePosts } from "@/hooks/useRealtimePosts";
import { setUserPresence } from "@/lib/appwrite/api";

const RootLayout = () => {
  const { isAuthenticated, isLoading, user } = useUserContext();
  useRealtimePosts();

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !user.accountId) return;

    const syncPresence = () =>
      setUserPresence(user.id, user.accountId, navigator.onLine).catch((error) =>
        console.error("Presence update failed", error)
      );

    syncPresence();
    const heartbeat = window.setInterval(syncPresence, 15_000);
    window.addEventListener("online", syncPresence);
    window.addEventListener("offline", syncPresence);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("online", syncPresence);
      window.removeEventListener("offline", syncPresence);
      setUserPresence(user.id, user.accountId, false).catch((error) =>
        console.error("Presence shutdown failed", error)
      );
    };
  }, [isAuthenticated, user]);

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <div className="app-shell w-full md:flex">
      <OfflineBanner />
      <Topbar />
      <LeftSidebar />

      <section className="flex flex-1 h-full">
        <Outlet />
      </section>

      <Bottombar />
    </div>
  );
};

export default RootLayout;
