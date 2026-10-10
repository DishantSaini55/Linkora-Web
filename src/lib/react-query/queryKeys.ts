export enum QUERY_KEYS {
  // AUTH KEYS
  CREATE_USER_ACCOUNT = "createUserAccount",

  // USER KEYS
  GET_CURRENT_USER = "getCurrentUser",
  GET_USERS = "getUsers",
  GET_USER_BY_ID = "getUserById",

  // POST KEYS
  GET_POSTS = "getPosts",
  GET_INFINITE_POSTS = "getInfinitePosts",
  GET_RECENT_POSTS = "getRecentPosts",
  GET_POST_BY_ID = "getPostById",
  GET_USER_POSTS = "getUserPosts",
  GET_FILE_PREVIEW = "getFilePreview",

  //  SEARCH KEYS
  SEARCH_POSTS = "getSearchPosts",
  SEARCH_USERS = "searchUsers",
  GET_NOTIFICATIONS = "getNotifications",
  GET_FOLLOW_RELATIONSHIP = "getFollowRelationship",
  GET_FOLLOW_COUNTS = "getFollowCounts",
  GET_FOLLOWING_PROFILE_IDS = "getFollowingProfileIds",
  GET_COMMENTS = "getComments",
  GET_UNREAD_NOTIFICATIONS = "getUnreadNotifications",
  GET_SAFETY_RELATIONSHIPS = "getSafetyRelationships",
  GET_DRAFTS = "getDrafts",
  GET_PREFERENCES = "getPreferences",
  GET_MESSAGES = "getMessages",
  GET_UNREAD_MESSAGES = "getUnreadMessages",
}
