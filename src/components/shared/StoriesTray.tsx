import { useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import StoriesViewer from "./StoriesViewer";
import { StoryWithSegments } from "@/lib/appwrite/api";

const StoriesTray = ({ stories }: { stories: StoryWithSegments[] }) => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <>
      <section aria-label="Stories" className="w-full rounded-2xl bg-dark-3/70 p-4">
        <div className="flex gap-4 overflow-x-auto pb-1">
          <button
            type="button"
            className="flex min-w-[72px] flex-col items-center gap-2 text-light-2"
            aria-label="Add Story"
            onClick={() => navigate("/create-story")}>
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-primary-500">
              <Plus size={22} />
            </span>
            <span className="small-medium">Add Story</span>
          </button>
          {stories.map((story, index) => (
            <button
              key={story.$id}
              type="button"
              className="flex min-w-[72px] flex-col items-center gap-2"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Open Story from ${story.owner}`}>
              <span className="rounded-full bg-gradient-to-tr from-primary-500 to-cyan-300 p-[2px]">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-dark-1 text-center text-[10px] text-light-2">
                  {story.owner.slice(0, 8)}
                </span>
              </span>
              <span className="small-medium max-w-[72px] truncate text-light-2">
                {story.owner}
              </span>
            </button>
          ))}
        </div>
      </section>
      {selectedIndex !== null && (
        <StoriesViewer
          stories={stories}
          initialStoryIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </>
  );
};

export default StoriesTray;
