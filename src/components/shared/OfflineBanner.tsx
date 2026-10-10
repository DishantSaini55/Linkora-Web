import { useEffect, useState } from "react";

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);
      if (!offline) {
        setShowRecovery(true);
        window.setTimeout(() => setShowRecovery(false), 3000);
      }
    };
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (!isOffline && !showRecovery) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-center text-sm text-amber-200 shadow-lg backdrop-blur">
      {isOffline
        ? "You are offline. Changes will sync when you reconnect."
        : "Back online. Connection restored."}
    </div>
  );
};

export default OfflineBanner;
