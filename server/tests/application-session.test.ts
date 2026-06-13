import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

const app = createApp();
const testPostIds: number[] = [];

async function tokenOf(mockOpenId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { mockOpenId } });
  return `mock-token-${user.id}`;
}

async function createPost(publisherMockOpenId: string) {
  const publisher = await prisma.user.findUniqueOrThrow({ where: { mockOpenId: publisherMockOpenId } });
  const startTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const endTime = new Date(Date.now() + 4 * 60 * 60 * 1000);
  const expireTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const post = await prisma.post.create({
    data: {
      publisherId: publisher.id,
      category: "测试申请",
      startTime,
      endTime,
      locationPref: "测试地点",
      feePref: "AA",
      description: "用于申请与会话接口测试",
      anonymousName: publisher.anonymousNo,
      expireTime,
    },
  });
  testPostIds.push(post.id);
  return post;
}

async function cleanupTestData() {
  if (testPostIds.length === 0) return;
  await prisma.message.deleteMany({ where: { session: { postId: { in: testPostIds } } } });
  await prisma.tempSession.deleteMany({ where: { postId: { in: testPostIds } } });
  await prisma.matchApplication.deleteMany({ where: { postId: { in: testPostIds } } });
  await prisma.post.deleteMany({ where: { id: { in: testPostIds } } });
  testPostIds.length = 0;
}

describe("applications and sessions", () => {
  beforeEach(cleanupTestData);
  afterEach(cleanupTestData);

  it("applies, accepts, and exposes sessions to both users", async () => {
    const aliceToken = await tokenOf("mock_alice");
    const bobToken = await tokenOf("mock_bob");
    const carolToken = await tokenOf("mock_carol");
    const alicePost = await createPost("mock_alice");
    const bobPost = await createPost("mock_bob");

    const selfApply = await request(app)
      .post(`/api/posts/${bobPost.id}/applications`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(selfApply.status).toBe(403);

    const apply = await request(app)
      .post(`/api/posts/${alicePost.id}/applications`)
      .set("Authorization", `Bearer ${bobToken}`)
      .send({ applyMessage: "我也想一起去" });
    expect(apply.status).toBe(200);
    expect(apply.body.data.application.status).toBe("pending");
    expect(apply.body.data.application.matchScore).toBeGreaterThanOrEqual(60);
    const applicationId = apply.body.data.application.id;

    const duplicate = await request(app)
      .post(`/api/posts/${alicePost.id}/applications`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(duplicate.status).toBe(409);

    const forbiddenList = await request(app)
      .get(`/api/posts/${alicePost.id}/applications`)
      .set("Authorization", `Bearer ${carolToken}`);
    expect(forbiddenList.status).toBe(403);

    const received = await request(app)
      .get("/api/applications/received")
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(received.status).toBe(200);
    expect(received.body.data.applications.some((item: { id: number }) => item.id === applicationId)).toBe(true);

    const forbiddenAccept = await request(app)
      .post(`/api/applications/${applicationId}/accept`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(forbiddenAccept.status).toBe(403);

    const accepted = await request(app)
      .post(`/api/applications/${applicationId}/accept`)
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.application.status).toBe("accepted");
    expect(accepted.body.data.post.status).toBe("matched");
    expect(accepted.body.data.session.id).toBeTruthy();
    const sessionId = accepted.body.data.session.id;

    const aliceSessions = await request(app).get("/api/sessions").set("Authorization", `Bearer ${aliceToken}`);
    expect(aliceSessions.status).toBe(200);
    expect(aliceSessions.body.data.sessions.some((item: { postId: number }) => item.postId === alicePost.id)).toBe(true);

    const bobSessions = await request(app).get("/api/sessions").set("Authorization", `Bearer ${bobToken}`);
    expect(bobSessions.status).toBe(200);
    expect(bobSessions.body.data.sessions.some((item: { postId: number }) => item.postId === alicePost.id)).toBe(true);

    const aliceMessage = await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ content: "你好，我们几点见？" });
    expect(aliceMessage.status).toBe(200);
    expect(aliceMessage.body.data.message.content).toBe("你好，我们几点见？");

    const bobMessages = await request(app)
      .get(`/api/sessions/${sessionId}/messages`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(bobMessages.status).toBe(200);
    expect(bobMessages.body.data.messages.some((item: { content: string }) => item.content === "你好，我们几点见？")).toBe(true);

    const forbiddenMessages = await request(app)
      .get(`/api/sessions/${sessionId}/messages`)
      .set("Authorization", `Bearer ${carolToken}`);
    expect(forbiddenMessages.status).toBe(404);

    const closed = await request(app)
      .post(`/api/sessions/${sessionId}/close`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(closed.status).toBe(200);
    expect(closed.body.data.session.status).toBe("closed");

    const afterClose = await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ content: "关闭后不能发" });
    expect(afterClose.status).toBe(409);
  });
});
