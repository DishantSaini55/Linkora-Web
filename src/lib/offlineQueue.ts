import { likePost } from "@/lib/appwrite/api";

type QueuedLike = {
  postId: string;
  likes: string[];
};

const QUEUE_KEY = "linkora:offline-like-queue";

const readQueue = (): QueuedLike[] => {
  try {
    const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const enqueueLike = (item: QueuedLike) => {
  const queue = readQueue().filter((queued) => queued.postId !== item.postId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, item]));
};

export const flushOfflineQueue = async () => {
  const queue = readQueue();
  if (!queue.length) return;
  const remaining: QueuedLike[] = [];
  for (const item of queue) {
    try {
      await likePost(item.postId, item.likes);
    } catch {
      remaining.push(item);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
};
