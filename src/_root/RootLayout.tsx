import { Navigate, Outlet } from "react-router-dom";

import Topbar from "@/components/shared/Topbar";
import Bottombar from "@/components/shared/Bottombar";
import LeftSidebar from "@/components/shared/LeftSidebar";
import Loader from "@/components/shared/Loader";
import OfflineBanner from "@/components/shared/OfflineBanner";
import { useUserContext } from "@/context/AuthContext";
import { useRealtimePosts } from "@/hooks/useRealtimePosts";

const RootLayout = () => {
  const { isAuthenticated, isLoading } = useUserContext();
  useRealtimePosts();

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
