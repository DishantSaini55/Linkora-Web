import { Link, useNavigate } from "react-router-dom";

import { Loader } from "@/components/shared";
import { Button } from "@/components/ui";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  useDeleteDraft,
  useGetDrafts,
} from "@/lib/react-query/queries";

const Drafts = () => {
  const navigate = useNavigate();
  const { user } = useUserContext();
  const { toast } = useToast();
  const { data: drafts = [], isLoading, isError } = useGetDrafts(user.id);
  const { mutate: deleteDraft, isLoading: isDeleting } = useDeleteDraft();

  const handleDelete = (draftId: string) => {
    if (!window.confirm("Delete this draft?")) return;
    deleteDraft(draftId, {
      onSuccess: () =>
        toast({
          title: "Draft deleted",
          description: "The cloud draft was removed.",
        }),
      onError: (error) =>
        toast({
          title: "Could not delete draft",
          description:
            error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        }),
    });
  };

  return (
    <div className="common-container">
      <div className="w-full max-w-5xl flex-between">
        <div>
          <p className="eyebrow">CREATE</p>
          <h1 className="h2-bold mt-2">Your drafts</h1>
          <p className="text-light-3 mt-2">
            Continue writing, publish, or remove your saved drafts.
          </p>
        </div>
        <Button
          type="button"
          className="shad-button_primary"
          onClick={() => navigate("/create-post")}>
          Create post
        </Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : isError ? (
        <p className="text-light-3">
          Drafts could not be loaded. Check your Appwrite Drafts permissions.
        </p>
      ) : !drafts.length ? (
        <div className="settings-card w-full max-w-5xl">
          <p className="body-medium">No cloud drafts yet.</p>
          <p className="small-regular text-light-3 mt-2">
            Save a post from the Create Post page to see it here.
          </p>
          <Link to="/create-post" className="text-primary-500 small-medium mt-4 inline-block">
            Start a draft
          </Link>
        </div>
      ) : (
        <ul className="w-full max-w-5xl grid gap-4 md:grid-cols-2">
          {drafts.map((draft) => (
            <li key={draft.$id} className="settings-card">
              {draft.imageUrl ? (
                <img
                  src={draft.imageUrl}
                  alt="Draft preview"
                  className="mb-4 h-48 w-full rounded-xl object-cover"
                />
              ) : null}
              <div className="flex-between gap-4">
                <p className="body-medium truncate">
                  {draft.caption || "Untitled draft"}
                </p>
                <span className="subtle-regular text-light-4 whitespace-nowrap">
                  {new Date(draft.$updatedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="small-regular text-light-3 mt-3">
                {draft.location || "No location"}
              </p>
              <p className="small-regular text-light-4 mt-1">
                {draft.tags || "No tags"}
              </p>
              <div className="flex gap-3 mt-5">
                <Button
                  type="button"
                  className="shad-button_primary"
                  onClick={() =>
                    navigate("/create-post", {
                      state: { draft },
                    })
                  }>
                  Open draft
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isDeleting}
                  onClick={() => handleDelete(draft.$id)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Drafts;
