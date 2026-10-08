import { Outlet, Navigate } from "react-router-dom";

import { useUserContext } from "@/context/AuthContext";
import Loader from "@/components/shared/Loader";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useUserContext();

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      {isAuthenticated ? (
        <Navigate to="/" replace />
      ) : (
        <>
          <section className="flex flex-1 justify-center items-center flex-col py-10">
            <Outlet />
          </section>

          <img
            src="/assets/images/side-img.svg"
            alt="logo"
            className="hidden xl:block h-screen w-1/2 object-cover bg-no-repeat"
          />
        </>
      )}
    </>
  );
}
