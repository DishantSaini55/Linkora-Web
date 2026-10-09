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
