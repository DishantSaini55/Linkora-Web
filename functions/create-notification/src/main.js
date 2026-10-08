import { Client, Databases, ID, Permission, Role } from "node-appwrite";

const allowedTypes = new Set(["like", "save"]);

export default async ({ req, res, error }) => {
  try {
    const actor = req.headers["x-appwrite-user-id"];
    if (!actor) {
      return res.json({ message: "Authentication is required." }, 401);
    }

    const body = req.body ? JSON.parse(req.body) : {};
    const { recipient, actor: requestedActor, type, post } = body;

    if (
      typeof recipient !== "string" ||
      typeof requestedActor !== "string" ||
      typeof post !== "string" ||
      !allowedTypes.has(type)
    ) {
      return res.json({ message: "Invalid notification payload." }, 400);
    }

    if (requestedActor !== actor) {
      return res.json({ message: "The actor does not match the session." }, 403);
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    const databases = new Databases(client);

    const notification = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_NOTIFICATION_COLLECTION_ID,
      ID.unique(),
      {
        recipient,
        actor,
        type,
        post,
        read: false,
      },
      [Permission.read(Role.user(recipient))]
    );

    return res.json(notification);
  } catch (caughtError) {
    error(caughtError instanceof Error ? caughtError.message : String(caughtError));
    return res.json({ message: "Notification creation failed." }, 500);
  }
};
