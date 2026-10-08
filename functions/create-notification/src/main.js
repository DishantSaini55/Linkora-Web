const allowedTypes = new Set(["like", "save"]);

export default async ({ req, res, error }) => {
  try {
    const actor = req.headers["x-appwrite-user-id"];
    if (!actor) {
      return res.json({ message: "Authentication is required." }, 401);
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};
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

    const endpoint = process.env.APPWRITE_ENDPOINT?.replace(/\/$/, "");
    const response = await fetch(
      `${endpoint}/databases/${process.env.APPWRITE_DATABASE_ID}/collections/${process.env.APPWRITE_NOTIFICATION_COLLECTION_ID}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": process.env.APPWRITE_PROJECT_ID,
          "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
        },
        body: JSON.stringify({
          documentId: "unique()",
          data: {
            recipient,
            actor,
            type,
            post,
            read: false,
          },
          permissions: [`read("user:${recipient}")`],
        }),
      }
    );
    const responseBody = await response.text();

    if (!response.ok) {
      throw new Error(
        `Appwrite returned ${response.status}: ${responseBody || "empty response"}`
      );
    }

    return res.json(JSON.parse(responseBody));
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : String(caughtError);
    const cause =
      caughtError instanceof Error && caughtError.cause
        ? ` Cause: ${String(caughtError.cause)}`
        : "";

    error(
      `${message}${cause} Endpoint: ${process.env.APPWRITE_ENDPOINT || "missing"}`
    );
    return res.json({ message: "Notification creation failed." }, 500);
  }
};
