const allowedTypes = new Set(["like", "save", "follow", "comment"]);
const aiTones = new Set([
  "casual",
  "professional",
  "funny",
  "inspirational",
  "educational",
]);
const aiLengths = new Set(["short", "medium", "long"]);
const commentsCollectionId =
  process.env.APPWRITE_COMMENTS_COLLECTION_ID ||
  process.env.APPWRITE_COMMENT_COLLECTION_ID ||
  process.env.COMMENTS_COLLECTION_ID;
const usersCollectionId =
  process.env.APPWRITE_USER_COLLECTION_ID ||
  process.env.APPWRITE_USERS_COLLECTION_ID ||
  process.env.USERS_COLLECTION_ID;
const rateLimitBuckets = new Map();
const toxicCommentPatterns = [
  /\b(?:kill\s+yourself|kys)\b/i,
  /\b(?:go\s+die|drop\s+dead)\b/i,
  /\b(?:n[i1]gg(?:er|a)|f[a@]gg(?:ot)?|ret[a@]rd)\b/i,
  /\b(?:ch[i1]nk|sp[i1]c|k[i1]ke|tr[a@]nny)\b/i,
  /\b(?:fuck(?:ing|ed)?|shit(?:ty|head)?|bitch(?:es)?|asshole|dumbass)\b/i,
  /\b(?:bastard|moron|idiot|loser|stupid|shut\s+up)\b/i,
  /\b(?:whore|slut|rape|rapist)\b/i,
];
const defaultBlockedCommentTerms = [
  "fuck",
  "fucking",
  "shit",
  "bitch",
  "asshole",
  "dumbass",
  "bastard",
  "moron",
  "idiot",
  "loser",
  "stupid",
  "whore",
  "slut",
];

function normalizeCommentText(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[@4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getToxicCommentReason(content) {
  const normalized = normalizeCommentText(content);
  const configuredTerms = (process.env.BLOCKED_COMMENT_TERMS || "")
    .split(",")
    .map((term) => normalizeCommentText(term))
    .filter(Boolean);
  const blockedTerms = new Set([
    ...defaultBlockedCommentTerms,
    ...configuredTerms,
  ]);
  const customTermPattern = new RegExp(
    `\\b(?:${Array.from(blockedTerms).map(escapeRegExp).join("|")})\\b`,
    "i"
  );
  return (
    toxicCommentPatterns.some((pattern) => pattern.test(normalized)) ||
    customTermPattern.test(normalized)
  )
    ? "This comment contains abusive or hateful language."
    : null;
}

function isModerator(accountId) {
  return (
    process.env.MODERATOR_ACCOUNT_IDS ||
    process.env.MODERATOR_ACCOUNT_ID ||
    ""
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(accountId);
}

function getRateLimitConfig(action) {
  const defaults = {
    ai: 10,
    comment: 30,
    message: 60,
  };
  const variable =
    action === "ai"
      ? "RATE_LIMIT_AI_MAX"
      : action === "comment"
        ? "RATE_LIMIT_COMMENT_MAX"
        : "RATE_LIMIT_MESSAGE_MAX";
  const configured = Number.parseInt(process.env[variable] || "", 10);
  const maximum = Number.isFinite(configured) && configured > 0
    ? configured
    : defaults[action];
  const configuredWindow = Number.parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || "",
    10
  );
  const windowMs =
    Number.isFinite(configuredWindow) && configuredWindow >= 1000
      ? configuredWindow
      : 60_000;
  return { maximum, windowMs };
}

function checkRateLimit(actor, action, now = Date.now()) {
  const { maximum, windowMs } = getRateLimitConfig(action);
  const key = `${action}:${actor}`;
  const current = rateLimitBuckets.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    rateLimitBuckets.set(key, { startedAt: now, count: 1 });
    return null;
  }

  if (current.count >= maximum) {
    return Math.max(1, Math.ceil((windowMs - (now - current.startedAt)) / 1000));
  }

  current.count += 1;
  return null;
}

function clearRateLimitState() {
  rateLimitBuckets.clear();
}

function isValidAttachment(attachmentId, attachmentUrl) {
  if (typeof attachmentId !== "string" || !/^[A-Za-z0-9._-]{1,100}$/.test(attachmentId)) {
    return false;
  }
  if (attachmentUrl === undefined || attachmentUrl === "") return true;
  if (typeof attachmentUrl !== "string" || attachmentUrl.length > 2048) {
    return false;
  }
  try {
    const url = new URL(attachmentUrl);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
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

async function hasSafetyBlock(databasePath, safetyCollectionId, owner, target) {
  const query = encodeURIComponent(
    JSON.stringify({ method: "equal", attribute: "owner", values: [owner] })
  );
  const targetQuery = encodeURIComponent(
    JSON.stringify({ method: "equal", attribute: "target", values: [target] })
  );
  const typeQuery = encodeURIComponent(
    JSON.stringify({ method: "equal", attribute: "type", values: ["block"] })
  );
  const result = await appwriteRequest(
    `${databasePath}/collections/${safetyCollectionId}/documents` +
      `?queries[]=${query}&queries[]=${targetQuery}&queries[]=${typeQuery}&limit=1`
  );
  return Array.isArray(result.documents) && result.documents.length > 0;
}

async function listGeminiModels(apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    { headers: { "Content-Type": "application/json" } }
  );
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Gemini model list returned ${response.status}: ${responseText.slice(0, 240)}`
    );
  }

  const payload = JSON.parse(responseText);
  return (Array.isArray(payload.models) ? payload.models : [])
    .filter(
      (model) =>
        typeof model.name === "string" &&
        Array.isArray(model.supportedGenerationMethods) &&
        model.supportedGenerationMethods.includes("generateContent")
    )
    .map((model) => model.name.replace(/^models\//, ""));
}

function isTextGenerationModel(model) {
  return !/(tts|audio|embedding|aqa|robotics|image|vision)/i.test(model);
}

async function resolveGeminiModel(apiKey, excludedModels = []) {
  const requestedModel = (process.env.GEMINI_MODEL || "").trim().replace(/^models\//, "");
  const supportedModels = (await listGeminiModels(apiKey)).filter(
    (model) =>
      isTextGenerationModel(model) && !excludedModels.includes(model)
  );

  if (requestedModel && supportedModels.includes(requestedModel)) {
    return requestedModel;
  }

  const preferredModel = supportedModels.find((model) =>
    /flash/i.test(model)
  );
  if (preferredModel) return preferredModel;
  if (supportedModels[0]) return supportedModels[0];

  throw new Error(
    requestedModel
      ? `GEMINI_MODEL "${requestedModel}" is unavailable and this API key has no model supporting generateContent.`
      : "This Gemini API key has no model supporting generateContent."
  );
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function generateWithAi({ topic, tone, length, hashtagsOnly = false }) {
    const instruction = hashtagsOnly
      ? "Return only 5 to 10 relevant hashtags for the provided post idea."
      : "Generate a social media caption, relevant hashtags, and one alternative caption.";
    const schema = hashtagsOnly
      ? '{"hashtags":["#Example"]}'
      : '{"caption":"...","hashtags":["#Example"],"alternativeCaption":"..."}';
    const prompt = `${instruction} Return valid JSON only. ${schema} Do not include unsafe, hateful, or discriminatory content.
Post idea: ${topic}
Tone: ${tone}
Length: ${length}`;
    const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
    let response;

    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured on the Function.");
      }
      const requestGemini = async (modelName) => {
        const endpoint =
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent` +
          `?key=${encodeURIComponent(apiKey)}`;
        return fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              responseMimeType: "application/json",
            },
          }),
        });
      };
      const excludedModels = [];
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const model = await resolveGeminiModel(apiKey, excludedModels);
        excludedModels.push(model);
        response = await requestGemini(model);
        if (response.ok) break;

        const failedResponse = await response.clone().text();
        const retryable =
          response.status === 404 ||
          response.status === 429 ||
          response.status === 503 ||
          (response.status === 400 &&
            /response modalities|audio|text modality/i.test(failedResponse));
        if (!retryable || attempt === 2) break;

        if (response.status === 429 || response.status === 503) {
          await wait(700 * (attempt + 1));
        }
      }
    } else if (provider === "openai") {
      const apiKey = process.env.AI_API_KEY;
      const endpoint = (
        process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions"
      ).replace(/\/$/, "");
      const model = process.env.AI_MODEL || "gpt-4o-mini";
      if (!apiKey) {
        throw new Error("AI_API_KEY is not configured on the Function.");
      }
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.8,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } else {
      throw new Error("Unsupported AI_PROVIDER. Use gemini or openai.");
    }

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`AI provider returned ${response.status}: ${responseText.slice(0, 240)}`);
    }
    const payload = JSON.parse(responseText);
    const content =
      provider === "gemini"
        ? payload.candidates?.[0]?.content?.parts?.[0]?.text
        : payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("AI provider returned no content.");
    const result = JSON.parse(content);
    const hashtags = Array.isArray(result.hashtags)
      ? result.hashtags
          .filter((tag) => typeof tag === "string")
          .map((tag) => (tag.trim().startsWith("#") ? tag.trim() : `#${tag.trim()}`))
          .filter((tag) => /^#[\p{L}\p{N}_]+$/u.test(tag))
          .slice(0, 10)
      : [];
    if (!hashtags.length) throw new Error("AI provider returned invalid hashtags.");
    if (hashtagsOnly) return { hashtags };
    if (
      typeof result.caption !== "string" ||
      typeof result.alternativeCaption !== "string"
    ) {
      throw new Error("AI provider returned an invalid caption response.");
    }
    return {
      caption: result.caption.trim().slice(0, 2200),
      alternativeCaption: result.alternativeCaption.trim().slice(0, 2200),
      hashtags,
    };
  }
export default async ({ req, res, error }) => {
  let action = "";
  try {
    const actor = req.headers["x-appwrite-user-id"];
    if (!actor) {
      return res.json({ message: "Authentication is required." }, 401);
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};
    action = typeof body.action === "string" ? body.action : "";
    if (
      body.action === "update-report" ||
      body.action === "delete-content"
    ) {
      if (!isModerator(actor)) {
        return res.json({ message: "Moderator authorization is required." }, 403);
      }
      if (!process.env.APPWRITE_REPORTS_COLLECTION_ID) {
        throw new Error(
          "Reports collection is not configured. Set APPWRITE_REPORTS_COLLECTION_ID."
        );
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
      if (!collectionId) {
        throw new Error(
          `${body.targetType === "post" ? "Posts" : "Comments"} collection is not configured.`
        );
      }
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

    if (body.action === "generate-caption" || body.action === "generate-hashtags") {
      if (
        typeof body.topic !== "string" ||
        !body.topic.trim() ||
        body.topic.length > 500 ||
        typeof body.tone !== "string" ||
        !aiTones.has(body.tone) ||
        typeof body.length !== "string" ||
        !aiLengths.has(body.length)
      ) {
        return res.json({ message: "Invalid AI generation request." }, 400);
      }
      const retryAfterSeconds = checkRateLimit(actor, "ai");
      if (retryAfterSeconds) {
        return res.json(
          {
            code: "RATE_LIMITED",
            message: "AI generation rate limit exceeded. Please try again later.",
            retryAfterSeconds,
          },
          429
        );
      }
      return res.json(
        await generateWithAi({
          topic: body.topic.trim(),
          tone: body.tone,
          length: body.length,
          hashtagsOnly: body.action === "generate-hashtags",
        })
      );
    }

    if (body.action === "create-comment") {
      if (
        typeof body.postId !== "string" ||
        typeof body.authorId !== "string" ||
        body.authorAccountId !== actor ||
        typeof body.content !== "string" ||
        body.content.length > 2000 ||
        !body.content.trim()
      ) {
        return res.json({ message: "Invalid comment payload." }, 400);
      }

      const moderationReason = getToxicCommentReason(body.content);
      if (moderationReason) {
        return res.json(
          { code: "COMMENT_MODERATION_BLOCKED", message: moderationReason },
          422
        );
      }
      const retryAfterSeconds = checkRateLimit(actor, "comment");
      if (retryAfterSeconds) {
        return res.json(
          {
            code: "RATE_LIMITED",
            message: "Comment rate limit exceeded. Please try again later.",
            retryAfterSeconds,
          },
          429
        );
      }
      if (!commentsCollectionId) {
        throw new Error(
          "Comments collection is not configured. Set APPWRITE_COMMENTS_COLLECTION_ID."
        );
      }

      const databasePath = `/databases/${process.env.APPWRITE_DATABASE_ID}`;
      return res.json(
        await appwriteRequest(
          `${databasePath}/collections/${commentsCollectionId}/documents`,
          {
            method: "POST",
            body: JSON.stringify({
              documentId: "unique()",
              data: {
                post: body.postId,
                author: body.authorId,
                content: body.content.trim(),
              },
              permissions: [
                "read(\"any\")",
                `update(\"user:${actor}\")`,
                `delete(\"user:${actor}\")`,
              ],
            }),
          }
        )
      );
    }

    if (body.action === "update-comment") {
      if (!commentsCollectionId || !usersCollectionId) {
        throw new Error(
          "Comments moderation requires APPWRITE_COMMENTS_COLLECTION_ID and APPWRITE_USER_COLLECTION_ID."
        );
      }
      if (
        typeof body.commentId !== "string" ||
        typeof body.content !== "string" ||
        body.content.length > 2000 ||
        !body.content.trim()
      ) {
        return res.json({ message: "Invalid comment update." }, 400);
      }

      const moderationReason = getToxicCommentReason(body.content);
      if (moderationReason) {
        return res.json(
          { code: "COMMENT_MODERATION_BLOCKED", message: moderationReason },
          422
        );
      }

      const databasePath = `/databases/${process.env.APPWRITE_DATABASE_ID}`;
      const existingComment = await appwriteRequest(
        `${databasePath}/collections/${commentsCollectionId}` +
          `/documents/${body.commentId}`
      );
      const authorProfile = await appwriteRequest(
        `${databasePath}/collections/${usersCollectionId}` +
          `/documents/${existingComment.author}`
      );
      if (authorProfile.accountId !== actor) {
        return res.json(
          { message: "Only the comment author can edit this comment." },
          403
        );
      }
      return res.json(
        await appwriteRequest(
          `${databasePath}/collections/${commentsCollectionId}` +
            `/documents/${body.commentId}`,
          {
            method: "PATCH",
            body: JSON.stringify({ data: { content: body.content.trim() } }),
          }
        )
      );
    }

    if (body.action === "delete-comment") {
      if (typeof body.commentId !== "string") {
        return res.json({ message: "A comment ID is required." }, 400);
      }
      if (!commentsCollectionId) {
        throw new Error(
          "Comment deletion requires APPWRITE_COMMENTS_COLLECTION_ID."
        );
      }

      const databasePath = `/databases/${process.env.APPWRITE_DATABASE_ID}`;
      const commentPath =
        `${databasePath}/collections/${commentsCollectionId}` +
        `/documents/${body.commentId}`;
      const existingComment = await appwriteRequest(commentPath);
      const hasOwnerDeletePermission = Array.isArray(existingComment.$permissions)
        ? existingComment.$permissions.some(
            (permission) =>
              permission === `delete("user:${actor}")` ||
              permission === `update("user:${actor}")`
          )
        : false;
      if (!hasOwnerDeletePermission && !isModerator(actor)) {
        return res.json(
          { message: "Only the comment author or a moderator can delete this comment." },
          403
        );
      }

      await appwriteRequest(commentPath, { method: "DELETE" });
      return res.json({ deleted: true });
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
        content.length > 2000 ||
        senderProfileId.length === 0 ||
        recipientProfileId.length === 0
      ) {
        return res.json({ message: "Invalid message payload." }, 400);
      }

      if (!content.trim() && !body.attachmentId) {
        return res.json({ message: "Message text or an attachment is required." }, 400);
      }
      if (
        body.attachmentId !== undefined &&
        !isValidAttachment(body.attachmentId, body.attachmentUrl)
      ) {
        return res.json({ message: "Invalid message attachment." }, 400);
      }
      const retryAfterSeconds = checkRateLimit(actor, "message");
      if (retryAfterSeconds) {
        return res.json(
          {
            code: "RATE_LIMITED",
            message: "Message rate limit exceeded. Please try again later.",
            retryAfterSeconds,
          },
          429
        );
      }
      if (!process.env.APPWRITE_MESSAGES_COLLECTION_ID) {
        throw new Error(
          "Messages collection is not configured. Set APPWRITE_MESSAGES_COLLECTION_ID."
        );
      }
      if (!usersCollectionId) {
        throw new Error(
          "Users collection is not configured. Set APPWRITE_USER_COLLECTION_ID."
        );
      }
      const databasePath = `/databases/${process.env.APPWRITE_DATABASE_ID}`;
      const [senderProfile, recipientProfile] = await Promise.all([
        appwriteRequest(
          `${databasePath}/collections/${usersCollectionId}/documents/${senderProfileId}`
        ),
        appwriteRequest(
          `${databasePath}/collections/${usersCollectionId}/documents/${recipientProfileId}`
        ),
      ]);
      if (senderProfile.accountId !== actor) {
        return res.json(
          { message: "The sender profile does not match the session." },
          403
        );
      }
      if (recipientProfile.accountId !== recipient) {
        return res.json(
          { message: "The recipient profile does not match the account." },
          403
        );
      }
      const safetyCollectionId = process.env.APPWRITE_SAFETY_COLLECTION_ID;
      if (safetyCollectionId) {
        const [senderBlockedRecipient, recipientBlockedSender] = await Promise.all([
          hasSafetyBlock(
            databasePath,
            safetyCollectionId,
            senderProfileId,
            recipientProfileId
          ),
          hasSafetyBlock(
            databasePath,
            safetyCollectionId,
            recipientProfileId,
            senderProfileId
          ),
        ]);
        if (senderBlockedRecipient || recipientBlockedSender) {
          return res.json(
            { code: "MESSAGE_BLOCKED", message: "Messaging is unavailable between these users." },
            403
          );
        }
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
              ...(body.attachmentId
                ? {
                    attachmentId: body.attachmentId,
                    attachmentUrl: body.attachmentUrl || "",
                  }
                : {}),
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
      if (!process.env.APPWRITE_MESSAGES_COLLECTION_ID) {
        throw new Error(
          "Messages collection is not configured. Set APPWRITE_MESSAGES_COLLECTION_ID."
        );
      }
      const path =
        `/databases/${process.env.APPWRITE_DATABASE_ID}` +
        `/collections/${process.env.APPWRITE_MESSAGES_COLLECTION_ID}` +
        `/documents/${body.messageId}`;
      const existing = await appwriteRequest(path);
      let senderAccountId = existing.senderAccountId;
      if (!senderAccountId && process.env.APPWRITE_USER_COLLECTION_ID) {
        const profile = await appwriteRequest(
          `/databases/${process.env.APPWRITE_DATABASE_ID}` +
            `/collections/${process.env.APPWRITE_USER_COLLECTION_ID}` +
            `/documents/${existing.sender}`
        );
        senderAccountId = profile.accountId;
      }
      if (senderAccountId !== actor) {
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
      if (!process.env.APPWRITE_NOTIFICATION_COLLECTION_ID) {
        throw new Error(
          "Notifications collection is not configured. Set APPWRITE_NOTIFICATION_COLLECTION_ID."
        );
      }
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
    if (!process.env.APPWRITE_NOTIFICATION_COLLECTION_ID) {
      throw new Error(
        "Notifications collection is not configured. Set APPWRITE_NOTIFICATION_COLLECTION_ID."
      );
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
    return res.json(
      {
        message:
          action === "generate-caption" ||
          action === "generate-hashtags" ||
          action === "create-comment" ||
          action === "update-comment" ||
          action === "delete-comment" ||
          action === "send-message" ||
          action === "edit-message" ||
          action === "delete-message" ||
          action === "mark-read" ||
          action === "update-report" ||
          action === "delete-content" ||
          action === ""
            ? message
            : "Notification creation failed.",
      },
      500
    );
  }
};

export {
  checkRateLimit,
  clearRateLimitState,
  getToxicCommentReason,
  isValidAttachment,
  isModerator,
  normalizeCommentText,
};
