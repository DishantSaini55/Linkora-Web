import { Outlet, Navigate } from "react-router-dom";

import { useUserContext } from "@/context/AuthContext";
import Loader from "@/components/shared/Loader";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useUserContext();

  if (isLoading) {
    return <Loader />;
  }

  return (
    <main className="auth-shell">
      {isAuthenticated ? (
        <Navigate to="/" replace />
      ) : (
        <div className="auth-layout">
          <section className="auth-panel">
            <Outlet />
          </section>

          <img
            src="/assets/images/side-img.svg"
            alt="logo"
            className="auth-art hidden xl:block"
          />
        </div>
      )}
    </main>
  );
}
