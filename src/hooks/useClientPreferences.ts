import { useEffect, useState } from "react";

import {
  getBlockedUserIds,
  getMutedUserIds,
} from "@/lib/clientPreferences";

export const useClientPreferences = () => {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setVersion((current) => current + 1);
    window.addEventListener("linkora:preferences-changed", refresh);
    return () =>
      window.removeEventListener("linkora:preferences-changed", refresh);
  }, []);

  return {
    blockedUserIds: getBlockedUserIds(),
    mutedUserIds: getMutedUserIds(),
    version,
  };
};
