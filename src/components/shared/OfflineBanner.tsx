import { useEffect, useState } from "react";

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const updateStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-center text-sm text-amber-200 shadow-lg backdrop-blur">
      You are offline. Cached content is still available.
    </div>
  );
};

export default OfflineBanner;
