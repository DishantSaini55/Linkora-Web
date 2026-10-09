const BLOCKED_USERS_KEY = "linkora:blocked-users";
const MUTED_USERS_KEY = "linkora:muted-users";

const readIds = (key: string): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

const writeIds = (key: string, ids: string[]) => {
  localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  window.dispatchEvent(new CustomEvent("linkora:preferences-changed"));
};

export const setBlockedUserIds = (ids: string[]) => writeIds(BLOCKED_USERS_KEY, ids);
export const setMutedUserIds = (ids: string[]) => writeIds(MUTED_USERS_KEY, ids);

export const getBlockedUserIds = () => readIds(BLOCKED_USERS_KEY);
export const getMutedUserIds = () => readIds(MUTED_USERS_KEY);

export const isUserBlocked = (userId: string) =>
  getBlockedUserIds().includes(userId);

export const isUserMuted = (userId: string) => getMutedUserIds().includes(userId);

export const toggleBlockedUser = (userId: string) => {
  const ids = getBlockedUserIds();
  writeIds(
    BLOCKED_USERS_KEY,
    ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]
  );
};

export const toggleMutedUser = (userId: string) => {
  const ids = getMutedUserIds();
  writeIds(
    MUTED_USERS_KEY,
    ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId]
  );
};
