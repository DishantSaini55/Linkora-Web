import { useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Models } from "appwrite";

import { getFileView } from "@/lib/appwrite/api";
import { useMarkStoryViewed } from "@/lib/react-query/queries";
import { StoryOverlay } from "@/types";

type Story = Models.Document & { segments: Models.Document[] };

type StoriesViewerProps = {
  stories: Story[];
  initialStoryIndex: number;
  onClose: () => void;
};

const StoriesViewer = ({
  stories,
  initialStoryIndex,
  onClose,
}: StoriesViewerProps) => {
  const [storyIndex, setStoryIndex] = useState(initialStoryIndex);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const { mutate: markViewed } = useMarkStoryViewed();
  const story = stories[storyIndex];
  const segment = story?.segments[segmentIndex];
  const mediaUrl = useMemo(
    () => (segment?.fileId ? getFileView(segment.fileId).toString() : ""),
    [segment?.fileId]
  );
  const overlays = useMemo<StoryOverlay[]>(() => {
    if (!segment?.overlays) return [];
    if (Array.isArray(segment.overlays)) return segment.overlays as StoryOverlay[];
    try {
      const parsed = JSON.parse(segment.overlays);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [segment?.overlays]);
  const music = useMemo(() => {
    if (!segment?.music) return null;
    if (typeof segment.music === "object") return segment.music;
    try {
      const parsed = JSON.parse(segment.music);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }, [segment?.music]);

  useEffect(() => {
    setSegmentIndex(0);
  }, [storyIndex]);

  useEffect(() => {
    setMuted(false);
  }, [segmentIndex, storyIndex]);

  useEffect(() => {
    if (!story || !segment || paused) return;
    markViewed({ storyId: story.$id, segmentId: segment.$id });
    const duration =
      segment.mediaType === "video"
        ? Math.max(1, Number(segment.durationSeconds) || 15)
        : 5;
    const timer = window.setTimeout(() => {
      if (segmentIndex < story.segments.length - 1) {
        setSegmentIndex((current) => current + 1);
      } else if (storyIndex < stories.length - 1) {
        setStoryIndex((current) => current + 1);
      } else {
        onClose();
      }
    }, duration * 1000);
    return () => window.clearTimeout(timer);
  }, [
    markViewed,
    onClose,
    paused,
    segment,
    segmentIndex,
    story,
    storyIndex,
    stories.length,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === " ") setPaused((current) => !current);
      if (event.key === "ArrowLeft") setSegmentIndex((current) => Math.max(0, current - 1));
      if (event.key === "ArrowRight") setSegmentIndex((current) => current + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!story || !segment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
      <div className="relative flex h-full w-full max-w-lg flex-col items-center justify-center">
        <div className="absolute inset-x-0 top-4 z-10 flex gap-1 px-4">
          {story.segments.map((item: Models.Document, index: number) => (
            <div key={item.$id} className="h-1 flex-1 rounded-full bg-white/30">
              <div
                className={`h-full rounded-full bg-white ${
                  index <= segmentIndex ? "w-full" : "w-0"
                }`}
              />
            </div>
          ))}
        </div>
        <div className="absolute right-4 top-10 z-10 flex gap-2">
          <button
            type="button"
            aria-label={paused ? "Resume Story" : "Pause Story"}
            className="rounded-full bg-black/50 p-2 text-white"
            onClick={() => setPaused((current) => !current)}>
            {paused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button
            type="button"
            aria-label={muted ? "Unmute Story audio" : "Mute Story audio"}
            className="rounded-full bg-black/50 px-3 py-2 text-xs text-white"
            onClick={() => setMuted((current) => !current)}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            aria-label="Close Story viewer"
            className="rounded-full bg-black/50 p-2 text-white"
            onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="absolute left-3 top-10 z-10 text-sm text-white">
          {story.owner}
        </div>
        <div className="relative max-h-[85vh] w-full">
          {segment.mediaType === "video" ? (
            <video
              key={segment.$id}
              src={mediaUrl}
              className="max-h-[85vh] w-full rounded-2xl object-contain"
              autoPlay={!paused}
              muted
              playsInline
              controls={false}
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Story"
              className="max-h-[85vh] w-full rounded-2xl object-contain"
            />
          )}
          {overlays.map((overlay, index) => (
            <span
              key={`${overlay.value}-${index}`}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-pre-wrap text-center font-semibold text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]"
              style={{
                left: `${overlay.x * 100}%`,
                top: `${overlay.y * 100}%`,
                transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg) scale(${overlay.scale})`,
                color: overlay.color || "white",
              }}>
              {overlay.value}
            </span>
          ))}
          {music?.fileId && (
            <audio
              key={`${segment.$id}-${music.fileId}`}
              src={getFileView(music.fileId).toString()}
              autoPlay={music.autoplay && !paused}
              muted={muted}
              loop
              controls={false}
              ref={(audio) => {
                if (audio) {
                  audio.volume = Math.min(1, Math.max(0, Number(music.volume) || 1));
                  audio.currentTime = Math.max(0, Number(music.startSeconds) || 0);
                }
              }}
              onTimeUpdate={(event) => {
                const endSeconds = Number(music.endSeconds);
                const startSeconds = Math.max(0, Number(music.startSeconds) || 0);
                if (Number.isFinite(endSeconds) && event.currentTarget.currentTime >= endSeconds) {
                  event.currentTarget.currentTime = startSeconds;
                }
              }}
            />
          )}
        </div>
        <button
          type="button"
          aria-label="Previous Story segment"
          className="absolute left-2 top-1/2 rounded-full bg-black/40 p-2 text-white"
          onClick={() => setSegmentIndex((current) => Math.max(0, current - 1))}>
          <ChevronLeft />
        </button>
        <button
          type="button"
          aria-label="Next Story segment"
          className="absolute right-2 top-1/2 rounded-full bg-black/40 p-2 text-white"
          onClick={() => {
            if (segmentIndex < story.segments.length - 1) {
              setSegmentIndex((current) => current + 1);
            } else if (storyIndex < stories.length - 1) {
              setStoryIndex((current) => current + 1);
            } else {
              onClose();
            }
          }}>
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};

export default StoriesViewer;
