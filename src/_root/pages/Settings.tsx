import { useMemo, useState } from "react";

import { Button } from "@/components/ui";
import { useUserContext } from "@/context/AuthContext";
import {
  useGetSafetyRelationships,
  useGetUsers,
  useSetSafetyRelationship,
} from "@/lib/react-query/queries";

const Settings = () => {
  const { user } = useUserContext();
  const { data: relationships = [] } = useGetSafetyRelationships(user.id);
  const { data: users } = useGetUsers();
  const { mutate: updateSafety } = useSetSafetyRelationship();
  const [notifyLikes, setNotifyLikes] = useState(
    localStorage.getItem("linkora:notify-likes") !== "false"
  );
  const [notifyComments, setNotifyComments] = useState(
    localStorage.getItem("linkora:notify-comments") !== "false"
  );

  const relationshipUsers = useMemo(
    () =>
      relationships
        .map((relationship) => ({
          relationship,
          user: users?.documents.find(
            (candidate) => candidate.$id === relationship.target
          ),
        }))
        .filter((item) => item.user),
    [relationships, users]
  );

  const setPreference = (key: string, value: boolean) => {
    localStorage.setItem(key, String(value));
    if (key === "linkora:notify-likes") setNotifyLikes(value);
    if (key === "linkora:notify-comments") setNotifyComments(value);
  };

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
              <li key={relationship.$id} className="settings-row">
                <span>
                  <strong>{target?.name}</strong>
                  <small>{relationship.type}</small>
                </span>
                <Button
                  variant="ghost"
                  onClick={() =>
                    updateSafety({
                      owner: user.id,
                      target: relationship.target,
                      type: relationship.type,
                      existingId: relationship.$id,
                    })
                  }>
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
