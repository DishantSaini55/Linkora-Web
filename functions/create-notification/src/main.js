const allowedTypes = new Set(["like", "save", "follow", "comment"]);

function isModerator(accountId) {
  return (process.env.MODERATOR_ACCOUNT_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(accountId);
}

async function appwriteRequest(path, options = {}) {
  const endpoint = process.env.APPWRITE_ENDPOINT?.replace(/\/$/, "");
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": process.env.APPWRITE_PROJECT_ID,
      "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Appwrite returned ${response.status}: ${text || "empty response"}`
    );
  }
  return text ? JSON.parse(text) : {};
}

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
      body.action === "update-report" ||
      body.action === "delete-content"
    ) {
      if (!isModerator(actor)) {
        return res.json({ message: "Moderator authorization is required." }, 403);
      }

      const databasePath = `/databases/${process.env.APPWRITE_DATABASE_ID}`;
      if (body.action === "update-report") {
        if (
          typeof body.reportId !== "string" ||
          !["pending", "reviewed", "dismissed", "action_taken"].includes(
            body.status
          )
        ) {
          return res.json({ message: "Invalid report update." }, 400);
        }
        return res.json(
          await appwriteRequest(
            `${databasePath}/collections/${process.env.APPWRITE_REPORTS_COLLECTION_ID}` +
              `/documents/${body.reportId}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                data: {
                  status: body.status,
                  moderatorNote:
                    typeof body.moderatorNote === "string"
                      ? body.moderatorNote.slice(0, 2200)
                      : "",
                  reviewedBy: actor,
                  reviewedAt: new Date().toISOString(),
                },
              }),
            }
          )
        );
      }

      if (
        !["post", "comment"].includes(body.targetType) ||
        typeof body.targetId !== "string" ||
        typeof body.reportId !== "string"
      ) {
        return res.json({ message: "Invalid moderation target." }, 400);
      }
      const collectionId =
        body.targetType === "post"
          ? process.env.APPWRITE_POST_COLLECTION_ID
          : process.env.APPWRITE_COMMENTS_COLLECTION_ID;
      await appwriteRequest(
        `${databasePath}/collections/${collectionId}/documents/${body.targetId}`,
        { method: "DELETE" }
      );
      return res.json(
        await appwriteRequest(
          `${databasePath}/collections/${process.env.APPWRITE_REPORTS_COLLECTION_ID}` +
            `/documents/${body.reportId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              data: {
                status: "action_taken",
                reviewedBy: actor,
                reviewedAt: new Date().toISOString(),
              },
            }),
          }
        )
      );
    }

    if (body.action === "send-message") {
      const {
        recipient,
        recipientProfileId,
        senderProfileId,
        content,
      } = body;
      if (
        typeof recipient !== "string" ||
        typeof recipientProfileId !== "string" ||
        typeof senderProfileId !== "string" ||
        typeof content !== "string" ||
        !content.trim() ||
        content.length > 2000 ||
        senderProfileId.length === 0 ||
        recipientProfileId.length === 0
      ) {
        return res.json({ message: "Invalid message payload." }, 400);
      }

      const endpoint = process.env.APPWRITE_ENDPOINT?.replace(/\/$/, "");
      const response = await fetch(
        `${endpoint}/databases/${process.env.APPWRITE_DATABASE_ID}` +
          `/collections/${process.env.APPWRITE_MESSAGES_COLLECTION_ID}/documents`,
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
              sender: senderProfileId,
              senderAccountId: actor,
              recipient: recipientProfileId,
              content: content.trim(),
              read: false,
              attachmentId: body.attachmentId || "",
              attachmentUrl: body.attachmentUrl || "",
            },
            permissions: [
              `read("user:${actor}")`,
              `read("user:${recipient}")`,
              `update("user:${actor}")`,
              `update("user:${recipient}")`,
            ],
          }),
        }
      );
      const responseBody = await response.text();
      if (!response.ok) {
        throw new Error(
          `Appwrite returned ${response.status}: ${
            responseBody || "empty response"
          }`
        );
      }
      return res.json(JSON.parse(responseBody));
    }

    if (body.action === "edit-message" || body.action === "delete-message") {
      if (typeof body.messageId !== "string") {
        return res.json({ message: "A message ID is required." }, 400);
      }
      const path =
        `/databases/${process.env.APPWRITE_DATABASE_ID}` +
        `/collections/${process.env.APPWRITE_MESSAGES_COLLECTION_ID}` +
        `/documents/${body.messageId}`;
      const existing = await appwriteRequest(path);
      if (existing.senderAccountId !== actor) {
        return res.json({ message: "Only the sender can modify this message." }, 403);
      }
      if (body.action === "delete-message") {
        await appwriteRequest(path, { method: "DELETE" });
        return res.json({ deleted: true });
      }
      if (typeof body.content !== "string" || !body.content.trim()) {
        return res.json({ message: "Message content is required." }, 400);
      }
      return res.json(
        await appwriteRequest(path, {
          method: "PATCH",
          body: JSON.stringify({
            data: {
              content: body.content.trim().slice(0, 2000),
              editedAt: new Date().toISOString(),
            },
          }),
        })
      );
    }

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
