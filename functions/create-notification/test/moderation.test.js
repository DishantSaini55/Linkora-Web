import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

process.env.APPWRITE_COMMENTS_COLLECTION_ID = "comments";
process.env.APPWRITE_USER_COLLECTION_ID = "users";

const {
  default: functionHandler,
  getToxicCommentReason,
  isModerator,
  normalizeCommentText,
} = await import("../src/main.js");

const originalEnvironment = {
  blockedTerms: process.env.BLOCKED_COMMENT_TERMS,
  moderatorIds: process.env.MODERATOR_ACCOUNT_IDS,
  moderatorId: process.env.MODERATOR_ACCOUNT_ID,
};
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalEnvironment.blockedTerms === undefined) {
    delete process.env.BLOCKED_COMMENT_TERMS;
  } else {
    process.env.BLOCKED_COMMENT_TERMS = originalEnvironment.blockedTerms;
  }
  if (originalEnvironment.moderatorIds === undefined) {
    delete process.env.MODERATOR_ACCOUNT_IDS;
  } else {
    process.env.MODERATOR_ACCOUNT_IDS = originalEnvironment.moderatorIds;
  }
  if (originalEnvironment.moderatorId === undefined) {
    delete process.env.MODERATOR_ACCOUNT_ID;
  } else {
    process.env.MODERATOR_ACCOUNT_ID = originalEnvironment.moderatorId;
  }
});

const invokeFunction = async (body, actor = "user-1") => {
  let responseStatus;
  let responseBody;
  await functionHandler({
    req: {
      headers: { "x-appwrite-user-id": actor },
      body: JSON.stringify(body),
    },
    res: {
      json(payload, status = 200) {
        responseBody = payload;
        responseStatus = status;
        return payload;
      },
    },
    error: () => {},
  });
  return { status: responseStatus, body: responseBody };
};

test("normalizes common obfuscation before moderation", () => {
  assert.equal(normalizeCommentText("F@ck"), "fack");
});

test("blocks configured abusive language", () => {
  assert.match(
    getToxicCommentReason("You should go die"),
    /abusive or hateful/
  );
});

test("blocks custom Function terms", () => {
  process.env.BLOCKED_COMMENT_TERMS = "project-specific phrase";
  assert.match(
    getToxicCommentReason("That is a project-specific phrase"),
    /abusive or hateful/
  );
});

test("allows ordinary comments", () => {
  assert.equal(getToxicCommentReason("Great post about cricket!"), null);
});

test("supports the plural moderator variable", () => {
  process.env.MODERATOR_ACCOUNT_IDS = "moderator-1, moderator-2";
  delete process.env.MODERATOR_ACCOUNT_ID;
  assert.equal(isModerator("moderator-2"), true);
  assert.equal(isModerator("user-1"), false);
});

test("supports the singular moderator variable", () => {
  delete process.env.MODERATOR_ACCOUNT_IDS;
  process.env.MODERATOR_ACCOUNT_ID = "moderator-1";
  assert.equal(isModerator("moderator-1"), true);
});

test("rejects unauthenticated requests", async () => {
  const result = await functionHandler({
    req: { headers: {}, body: "{}" },
    res: {
      json(payload, status = 200) {
        return { payload, status };
      },
    },
    error: () => {},
  });
  assert.deepEqual(result, {
    payload: { message: "Authentication is required." },
    status: 401,
  });
});

test("rejects an invalid comment payload before any database request", async () => {
  const result = await invokeFunction({ action: "create-comment" });
  assert.equal(result.status, 400);
  assert.equal(result.body.message, "Invalid comment payload.");
});

test("rejects toxic comments at the request boundary", async () => {
  const result = await invokeFunction({
    action: "create-comment",
    postId: "post-1",
    authorId: "profile-1",
    authorAccountId: "user-1",
    content: "go die",
  });
  assert.equal(result.status, 422);
  assert.equal(result.body.code, "COMMENT_MODERATION_BLOCKED");
});

test("rejects notification actor spoofing", async () => {
  const result = await invokeFunction(
    {
      recipient: "user-2",
      actor: "user-2",
      type: "comment",
      post: "post-1",
    },
    "user-1"
  );
  assert.equal(result.status, 403);
  assert.equal(result.body.message, "The actor does not match the session.");
});

test("creates a moderated comment through Appwrite", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    return new Response(
      JSON.stringify({ $id: "comment-1", content: "Hello" }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  };

  const result = await invokeFunction({
    action: "create-comment",
    postId: "post-1",
    authorId: "profile-1",
    authorAccountId: "user-1",
    content: "Hello",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.$id, "comment-1");
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/collections\/comments\/documents$/);
  assert.equal(JSON.parse(requests[0].options.body).data.author, "profile-1");
});

test("updates a comment after verifying its author", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (!options.method || options.method === "GET") {
      if (String(url).includes("/collections/users/")) {
        return new Response(JSON.stringify({ accountId: "user-1" }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ author: "profile-1" }), {
        status: 200,
      });
    }
    return new Response(JSON.stringify({ $id: "comment-1", content: "Updated" }), {
      status: 200,
    });
  };

  const result = await invokeFunction({
    action: "update-comment",
    commentId: "comment-1",
    authorAccountId: "user-1",
    content: "Updated",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.content, "Updated");
  assert.equal(requests.filter(({ options }) => options.method === "PATCH").length, 1);
});

test("allows the comment owner to delete using row permissions", async () => {
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (options.method === "DELETE") {
      return new Response(JSON.stringify({}), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        $id: "comment-1",
        $permissions: ['delete("user:user-1")'],
      }),
      { status: 200 }
    );
  };

  const result = await invokeFunction(
    { action: "delete-comment", commentId: "comment-1" },
    "user-1"
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { deleted: true });
  assert.equal(requests[1].options.method, "DELETE");
});

test("allows a moderator to delete without owner row permission", async () => {
  process.env.MODERATOR_ACCOUNT_ID = "moderator-1";
  globalThis.fetch = async (_url, options = {}) =>
    options.method === "DELETE"
      ? new Response(JSON.stringify({}), { status: 200 })
      : new Response(JSON.stringify({ $permissions: [] }), { status: 200 });

  const result = await invokeFunction(
    { action: "delete-comment", commentId: "comment-1" },
    "moderator-1"
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { deleted: true });
});

test("rejects a non-owner without moderator access", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ $permissions: ['delete("user:someone-else")'] }),
      { status: 200 }
    );

  const result = await invokeFunction(
    { action: "delete-comment", commentId: "comment-1" },
    "user-1"
  );

  assert.equal(result.status, 403);
  assert.match(result.body.message, /comment author or a moderator/);
});
