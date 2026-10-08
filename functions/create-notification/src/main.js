const allowedTypes = new Set(["like", "save", "follow", "comment"]);

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
    if (
      body.action === "mark-read" &&
      typeof body.recipient === "string" &&
      body.recipient === actor
    ) {
      const endpoint = process.env.APPWRITE_ENDPOINT?.replace(/\/$/, "");
      const baseUrl =
        `${endpoint}/databases/${process.env.APPWRITE_DATABASE_ID}` +
        `/collections/${process.env.APPWRITE_NOTIFICATION_COLLECTION_ID}`;
      const listUrl = new URL(`${baseUrl}/documents`);
      listUrl.searchParams.append(
        "queries[]",
        JSON.stringify({ method: "equal", attribute: "recipient", values: [actor] })
      );
      const listResponse = await fetch(listUrl, {
        headers: {
          "X-Appwrite-Project": process.env.APPWRITE_PROJECT_ID,
          "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
        },
      });
      const listBody = await listResponse.text();
      if (!listResponse.ok) {
        throw new Error(
          `Appwrite returned ${listResponse.status}: ${listBody || "empty response"}`
        );
      }

      const documents = JSON.parse(listBody).documents || [];
      await Promise.all(
        documents
          .filter((document) => !document.read)
          .map(async (document) => {
            const updateResponse = await fetch(
              `${baseUrl}/documents/${document.$id}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "X-Appwrite-Project": process.env.APPWRITE_PROJECT_ID,
                  "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
                },
                body: JSON.stringify({ data: { read: true } }),
              }
            );
            if (!updateResponse.ok) {
              const updateBody = await updateResponse.text();
              throw new Error(
                `Appwrite returned ${updateResponse.status}: ${
                  updateBody || "empty response"
                }`
              );
            }
          })
      );

      return res.json({ updated: documents.filter((document) => !document.read).length });
    }

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
