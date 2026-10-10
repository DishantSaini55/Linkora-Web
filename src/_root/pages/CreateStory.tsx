import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui";
import { useUserContext } from "@/context/AuthContext";
import {
  createStory,
  deleteFile,
  uploadStoryMediaFile,
} from "@/lib/appwrite/api";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/react-query/queryKeys";
import { StoryOverlay, StoryPrivacy } from "@/types";

type DraftSegment = {
  file: File;
  previewUrl: string;
  mediaType: "image" | "video";
  durationSeconds?: number;
  overlays: StoryOverlay[];
};

const MAX_SEGMENTS = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const readVideoDuration = (file: File) =>
  new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name} as a video.`));
    };
    video.src = url;
  });

const CreateStory = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUserContext();
  const [segments, setSegments] = useState<DraftSegment[]>([]);
  const [privacy, setPrivacy] = useState<StoryPrivacy>("public");
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [overlayText, setOverlayText] = useState("");
  const segmentsRef = useRef<DraftSegment[]>([]);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(
    () => () => {
      segmentsRef.current.forEach((segment) =>
        URL.revokeObjectURL(segment.previewUrl)
      );
    },
    []
  );

  const addFiles = async (files: File[]) => {
    setError("");
    if (segments.length + files.length > MAX_SEGMENTS) {
      setError(`You can add up to ${MAX_SEGMENTS} Story segments.`);
      return;
    }

    const nextSegments: DraftSegment[] = [];
    try {
      for (const file of files) {
        if (
          (!file.type.startsWith("image/") &&
            !file.type.startsWith("video/")) ||
          file.size > MAX_FILE_SIZE
        ) {
          throw new Error("Use image or video files smaller than 50 MB.");
        }
        const durationSeconds = file.type.startsWith("video")
          ? await readVideoDuration(file)
          : undefined;
        if (
          durationSeconds !== undefined &&
          (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 60)
        ) {
          throw new Error("Videos must be no longer than 60 seconds.");
        }
        nextSegments.push({
          file,
          previewUrl: URL.createObjectURL(file),
          mediaType: file.type.startsWith("video") ? "video" : "image",
          durationSeconds,
          overlays: [],
        });
      }
      setSegments((current) => [...current, ...nextSegments]);
    } catch (caughtError) {
      nextSegments.forEach((segment) => URL.revokeObjectURL(segment.previewUrl));
      setError(caughtError instanceof Error ? caughtError.message : "Invalid Story media.");
    }
  };

  const removeSegment = (index: number) => {
    setSegments((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const moveSegment = (index: number, direction: -1 | 1) => {
    setSegments((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[targetIndex]] = [
        reordered[targetIndex],
        reordered[index],
      ];
      return reordered;
    });
  };

  const publish = async () => {
    if (!user.accountId || segments.length === 0) {
      setError("Add at least one image or video before publishing.");
      return;
    }
    setIsPublishing(true);
    setError("");
    const uploadedIds: string[] = [];
    try {
      const uploadedSegments = [];
      for (const [index, segment] of segments.entries()) {
        const uploaded = await uploadStoryMediaFile(segment.file, user.accountId);
        uploadedIds.push(uploaded.$id);
        uploadedSegments.push({
          order: index,
          mediaType: segment.mediaType,
          fileId: uploaded.$id,
          ...(segment.durationSeconds !== undefined
            ? { durationSeconds: segment.durationSeconds }
            : {}),
          overlays: segment.overlays,
        });
      }
      await createStory({ privacy, segments: uploadedSegments });
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_STORIES] });
      navigate("/");
    } catch (caughtError) {
      await Promise.allSettled(uploadedIds.map((fileId) => deleteFile(fileId)));
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Story publishing failed. Please try again."
      );
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="flex flex-1 justify-center overflow-y-auto px-5 py-8">
      <div className="w-full max-w-4xl">
        <button
          type="button"
          className="small-semibold mb-6 flex items-center gap-2 text-light-2"
          onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="settings-card">
          <p className="eyebrow">STORY STUDIO</p>
          <h1 className="h2-bold mt-2">Create a Story</h1>
          <p className="small-regular mt-2 text-light-3">
            Add up to 10 image or video segments. Media is validated again by the server.
          </p>
          <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-dark-3 p-8 text-center">
            <span className="base-semibold text-light-1">Choose Story media</span>
            <span className="small-regular mt-2 text-light-4">
              Images or videos up to 50 MB each
            </span>
            <input
              type="file"
              className="sr-only"
              accept="image/*,video/*"
              multiple
              onChange={async (event) => {
                await addFiles(Array.from(event.target.files || []));
                event.currentTarget.value = "";
              }}
            />
          </label>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {segments.map((segment, index) => (
              <div key={`${segment.file.name}-${index}`} className="rounded-xl bg-dark-3 p-3">
                <div className="relative">
                  {segment.mediaType === "video" ? (
                    <video src={segment.previewUrl} className="h-56 w-full rounded-lg object-cover" muted />
                  ) : (
                    <img src={segment.previewUrl} alt={segment.file.name} className="h-56 w-full rounded-lg object-cover" />
                  )}
                  {segment.overlays.map((overlay, overlayIndex) => (
                    <span
                      key={`${overlay.value}-${overlayIndex}`}
                      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-pre-wrap text-center font-semibold text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]"
                      style={{ color: overlay.color || "white", transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg) scale(${overlay.scale})` }}>
                      {overlay.value}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="small-medium truncate text-light-2">{index + 1}. {segment.file.name}</span>
                  <button type="button" aria-label={`Remove segment ${index + 1}`} onClick={() => removeSegment(index)}>
                    <Trash2 size={16} className="text-red" />
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button type="button" className="shad-button_dark_4 flex-1" onClick={() => setSelectedIndex(index)}>
                    Edit overlay
                  </Button>
                  <Button type="button" className="shad-button_dark_4 flex-1" disabled={index === 0} onClick={() => moveSegment(index, -1)}>
                    <ChevronUp size={16} />
                  </Button>
                  <Button type="button" className="shad-button_dark_4 flex-1" disabled={index === segments.length - 1} onClick={() => moveSegment(index, 1)}>
                    <ChevronDown size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {segments[selectedIndex] && (
            <div className="mt-6 rounded-xl bg-dark-3 p-4">
              <p className="small-semibold text-light-2">
                Overlay for segment {selectedIndex + 1}
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={overlayText}
                  onChange={(event) => setOverlayText(event.target.value.slice(0, 200))}
                  placeholder="Add text overlay"
                  className="shad-input flex-1"
                  maxLength={200}
                />
                <Button
                  type="button"
                  className="shad-button_dark_4"
                  onClick={() => {
                    const value = overlayText.trim();
                    if (!value) return;
                    setSegments((current) =>
                      current.map((segment, index) =>
                        index === selectedIndex
                          ? {
                              ...segment,
                              overlays: [
                                ...segment.overlays,
                                {
                                  type: "text",
                                  value,
                                  x: 0.5,
                                  y: 0.5,
                                  scale: 1,
                                  rotation: 0,
                                },
                              ],
                            }
                          : segment
                      )
                    );
                    setOverlayText("");
                  }}>
                  Add
                </Button>
                {["✨", "❤️", "🔥", "😂"].map((emoji) => (
                  <Button
                    key={emoji}
                    type="button"
                    className="shad-button_dark_4 px-3"
                    onClick={() =>
                      setSegments((current) =>
                        current.map((segment, index) =>
                          index === selectedIndex
                            ? {
                                ...segment,
                                overlays: [
                                  ...segment.overlays,
                                  {
                                    type: "emoji",
                                    value: emoji,
                                    x: 0.5,
                                    y: 0.5,
                                    scale: 1,
                                    rotation: 0,
                                  },
                                ],
                              }
                            : segment
                        )
                      )
                    }>
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <label className="mt-6 flex flex-col gap-2">
            <span className="small-semibold text-light-2">Who can view this Story?</span>
            <select
              value={privacy}
              onChange={(event) => setPrivacy(event.target.value as StoryPrivacy)}
              className="shad-input">
              <option value="public">Everyone</option>
              <option value="followers">Followers only</option>
            </select>
          </label>
          {error && <p className="small-regular mt-4 text-red">{error}</p>}
          <Button
            type="button"
            className="shad-button_primary mt-6 w-full"
            disabled={isPublishing || segments.length === 0}
            onClick={publish}>
            {isPublishing ? "Publishing..." : "Publish Story"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateStory;
