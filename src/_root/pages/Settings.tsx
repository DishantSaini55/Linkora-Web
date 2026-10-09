import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui";
import { useUserContext } from "@/context/AuthContext";
import {
  useGetSafetyRelationships,
  useGetUsers,
  useSetSafetyRelationship,
  useGetNotificationPreferences,
  useSaveNotificationPreferences,
} from "@/lib/react-query/queries";
import {
  getBlockedUserIds,
  getMutedUserIds,
  setBlockedUserIds,
  setMutedUserIds,
  toggleBlockedUser,
  toggleMutedUser,
} from "@/lib/clientPreferences";
import { isSafetyConfigured } from "@/lib/appwrite/config";
import { useClientPreferences } from "@/hooks/useClientPreferences";

const Settings = () => {
  const { user } = useUserContext();
  const {
    data: relationships,
    isLoading: isSafetyLoading,
    isSuccess: isSafetyLoaded,
  } = useGetSafetyRelationships(user.id);
  const { data: users } = useGetUsers();
  const { mutate: updateSafety } = useSetSafetyRelationship();
  const { data: cloudPreferences } = useGetNotificationPreferences(user.id);
  const { mutate: saveCloudPreferences } = useSaveNotificationPreferences();
  const { blockedUserIds, mutedUserIds } = useClientPreferences();
  const [notifyLikes, setNotifyLikes] = useState(
    localStorage.getItem("linkora:notify-likes") !== "false"
  );
  const [notifyComments, setNotifyComments] = useState(
    localStorage.getItem("linkora:notify-comments") !== "false"
  );
  const [notifyFollows, setNotifyFollows] = useState(
    localStorage.getItem("linkora:notify-follows") !== "false"
  );
  const [notifySaves, setNotifySaves] = useState(
    localStorage.getItem("linkora:notify-saves") !== "false"
  );
  const [preferenceId, setPreferenceId] = useState<string>();

  const syncedRelationships = relationships || [];
  const relationshipUsers = useMemo(() => {
    type SafetyRelationship = {
      $id?: string;
      target: string;
      type: "block" | "mute";
    };
    const cloudByTarget = new Map<string, SafetyRelationship>(
      syncedRelationships.map((relationship) => [
        `${relationship.target}:${relationship.type}`,
        {
          $id: relationship.$id,
          target: relationship.target,
          type: relationship.type,
        },
      ])
    );
    const localRelationships: SafetyRelationship[] = [
      ...blockedUserIds.map((target) => ({
        target,
        type: "block" as const,
      })),
      ...mutedUserIds.map((target) => ({
        target,
        type: "mute" as const,
      })),
    ];
    const merged = new Map(cloudByTarget);

    localRelationships.forEach((relationship) => {
      const key = `${relationship.target}:${relationship.type}`;
      if (!merged.has(key)) merged.set(key, relationship);
    });

    return Array.from(merged.values())
      .map((relationship) => ({
        relationship,
        user: users?.documents.find(
          (candidate) => candidate.$id === relationship.target
        ),
      }))
      .filter((item) => item.user);
  }, [blockedUserIds, mutedUserIds, syncedRelationships, users]);

  useEffect(() => {
    if (!isSafetyConfigured || !isSafetyLoaded || isSafetyLoading) return;
    setBlockedUserIds([
      ...new Set([
        ...getBlockedUserIds(),
        ...syncedRelationships
          .filter((relationship) => relationship.type === "block")
          .map((relationship) => relationship.target),
      ]),
    ]);
    setMutedUserIds([
      ...new Set([
        ...getMutedUserIds(),
        ...syncedRelationships
          .filter((relationship) => relationship.type === "mute")
          .map((relationship) => relationship.target),
      ]),
    ]);
  }, [isSafetyLoaded, isSafetyLoading, syncedRelationships]);

  const setPreference = (key: string, value: boolean) => {
    localStorage.setItem(key, String(value));
    if (key === "linkora:notify-likes") setNotifyLikes(value);
    if (key === "linkora:notify-comments") setNotifyComments(value);
    if (key === "linkora:notify-follows") setNotifyFollows(value);
    if (key === "linkora:notify-saves") setNotifySaves(value);
    const next = {
      likes: key === "linkora:notify-likes" ? value : notifyLikes,
      comments: key === "linkora:notify-comments" ? value : notifyComments,
      follows: key === "linkora:notify-follows" ? value : notifyFollows,
      saves: key === "linkora:notify-saves" ? value : notifySaves,
    };
    saveCloudPreferences({
      owner: user.id,
      accountId: user.accountId,
      preferences: next,
      preferenceId,
    });
  };

  useEffect(() => {
    if (!cloudPreferences) return;
    setPreferenceId(cloudPreferences.$id);
    setNotifyLikes(cloudPreferences.likes !== false);
    setNotifyComments(cloudPreferences.comments !== false);
    setNotifyFollows(cloudPreferences.follows !== false);
    setNotifySaves(cloudPreferences.saves !== false);
    localStorage.setItem("linkora:notify-likes", String(cloudPreferences.likes !== false));
    localStorage.setItem("linkora:notify-comments", String(cloudPreferences.comments !== false));
    localStorage.setItem("linkora:notify-follows", String(cloudPreferences.follows !== false));
    localStorage.setItem("linkora:notify-saves", String(cloudPreferences.saves !== false));
  }, [cloudPreferences]);

  return (
    <div className="common-container">
      <div className="w-full max-w-5xl">
        <p className="eyebrow">ACCOUNT CONTROLS</p>
        <h1 className="h2-bold mt-2">Settings</h1>
        <p className="text-light-3 mt-2">
          Control your safety preferences and the updates you receive.
        </p>
      </div>

      <section className="settings-card">
        <h2 className="body-bold">Notification preferences</h2>
        <label className="settings-row">
          <span>
            <strong>Likes</strong>
            <small>When someone likes your posts</small>
          </span>
          <input
            type="checkbox"
            checked={notifyLikes}
            onChange={(event) =>
              setPreference("linkora:notify-likes", event.target.checked)
            }
          />
        </label>
        <label className="settings-row">
          <span><strong>Follows</strong><small>When someone follows you</small></span>
          <input type="checkbox" checked={notifyFollows} onChange={(event) => setPreference("linkora:notify-follows", event.target.checked)} />
        </label>
        <label className="settings-row">
          <span><strong>Saves</strong><small>When someone saves your posts</small></span>
          <input type="checkbox" checked={notifySaves} onChange={(event) => setPreference("linkora:notify-saves", event.target.checked)} />
        </label>
        <label className="settings-row">
          <span>
            <strong>Comments</strong>
            <small>When someone comments on your posts</small>
          </span>
          <input
            type="checkbox"
            checked={notifyComments}
            onChange={(event) =>
              setPreference("linkora:notify-comments", event.target.checked)
            }
          />
        </label>
      </section>

      <section className="settings-card">
        <h2 className="body-bold">Blocked and muted users</h2>
        {!relationshipUsers.length ? (
          <p className="text-light-3 mt-4">No synced safety preferences yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {relationshipUsers.map(({ relationship, user: target }) => (
              <li
                key={`${relationship.target}:${relationship.type}`}
                className="settings-row">
                <span>
                  <strong>{target?.name}</strong>
                  <small>{relationship.type}</small>
                </span>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (relationship.type === "block") {
                      toggleBlockedUser(relationship.target);
                    } else {
                      toggleMutedUser(relationship.target);
                    }
                    if (relationship.$id) {
                      updateSafety({
                        owner: user.id,
                        target: relationship.target,
                        type: relationship.type,
                        existingId: relationship.$id,
                      });
                    }
                  }}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Settings;
