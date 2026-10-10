export type INavLink = {
  imgURL: string;
  route: string;
  label: string;
};

export type IUpdateUser = {
  userId: string;
  name: string;
  username: string;
  bio: string;
  imageId?: string;
  imageUrl: URL | string;
  file: File[];
  removeImage?: boolean;
};

export type INewPost = {
  userId: string;
  caption: string;
  file: File[];
  location?: string;
  tags?: string;
};

export type IUpdatePost = {
  postId: string;
  caption: string;
  imageId: string;
  imageUrl: URL;
  file: File[];
  location?: string;
  tags?: string;
};

export type IUser = {
  id: string;
  accountId: string;
  name: string;
  username: string;
  email: string;
  imageUrl: string;
  bio: string;
  imageId?: string;
  nameChangedAt?: string;
  usernameChangedAt?: string;
};

export type INewUser = {
  name: string;
  email: string;
  username: string;
  password: string;
};

export type IMessage = {
  $id: string;
  $createdAt: string;
  sender: string;
  recipient: string;
  content: string;
  read: boolean;
  attachmentId?: string;
  attachmentUrl?: string;
  editedAt?: string;
};

export type StoryPrivacy = "public" | "followers";

export type StoryMediaType = "image" | "video";

export type StoryOverlay = {
  type: "text" | "emoji" | "music";
  x: number;
  y: number;
  scale: number;
  rotation: number;
  value: string;
  color?: string;
  fontSize?: number;
};

export type StoryMusic = {
  source: "user-upload";
  fileId: string;
  title: string;
  artist?: string;
  startSeconds: number;
  endSeconds: number;
  volume: number;
  autoplay: boolean;
};

export type IStory = {
  $id: string;
  $createdAt: string;
  owner: string;
  privacy: StoryPrivacy;
  expiresAt: string;
  status: "published" | "expired" | "deleted";
};

export type IStorySegment = {
  $id: string;
  storyId: string;
  owner: string;
  order: number;
  mediaType: StoryMediaType;
  fileId: string;
  durationSeconds?: number;
  overlays?: StoryOverlay[];
  music?: StoryMusic;
};

export type IStoryView = {
  $id: string;
  storyId: string;
  segmentId: string;
  viewerAccountId: string;
  viewedAt: string;
};

export type INewStory = {
  privacy: StoryPrivacy;
  expiresInHours?: number;
  segments: Array<{
    order: number;
    mediaType: StoryMediaType;
    fileId: string;
    durationSeconds?: number;
    overlays?: StoryOverlay[];
  }>;
};
