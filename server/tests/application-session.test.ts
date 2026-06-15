import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

const app = createApp();
const testPostIds: number[] = [];
const testUserIds: number[] = [];

function tokenOf(userId: number) {
  return `mock-token-${userId}`;
}

async function createUser(suffix: string) {
  const user = await prisma.user.create({
    data: {
      mockOpenId: `app_${suffix}_${Date.now()}_${Math.random()}`,
      studentNo: `app_${suffix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      realName: `测试${suffix}`,
      nickname: `测试${suffix}`,
      college: "计算机学院",
      grade: "2025",
      anonymousNo: `测试${suffix}`,
      wechatId: `wechat_${suffix}`,
      onboardingCompleted: true,
      personalTraits: JSON.stringify(["善良", "坦诚", "幽默"]),
    },
  });
  testUserIds.push(user.id);
  return user;
}

async function createPostForUser(publisher: { id: number; anonymousNo: string }, offsetDays: number) {
  const startTime = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
  const expireTime = new Date(startTime.getTime() - 60 * 60 * 1000);
  const post = await prisma.post.create({
    data: {
      publisherId: publisher.id,
      title: "测试申请想搭",
      detail: "用于申请与会话接口测试",
      category: "吃饭",
      startTime,
      endTime,
      activityLocation: "测试地点",
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
  await prisma.message.deleteMany({ where: { session: { postId: { in: testPostIds } } } });
  await prisma.tempSession.deleteMany({ where: { postId: { in: testPostIds } } });
  await prisma.matchApplication.deleteMany({ where: { postId: { in: testPostIds } } });
  await prisma.post.deleteMany({ where: { id: { in: testPostIds } } });
  await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
  testPostIds.length = 0;
  testUserIds.length = 0;
}

describe("applications and sessions", () => {
  beforeEach(cleanupTestData);
  afterEach(cleanupTestData);

  it("applies, blocks pending chat, accepts, chats, and exchanges contact", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const carol = await createUser("carol");
    const aliceToken = tokenOf(alice.id);
    const bobToken = tokenOf(bob.id);
    const carolToken = tokenOf(carol.id);
    const alicePost = await createPostForUser(alice, 9);
    const bobPost = await createPostForUser(bob, 10);

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
    const applicationId = apply.body.data.application.id;

    const pendingList = await request(app).get("/api/sessions").set("Authorization", `Bearer ${bobToken}`);
    expect(pendingList.status).toBe(200);
    expect(pendingList.body.data.items.some((item: { type: string; applicationId: number }) => item.type === "application" && item.applicationId === applicationId)).toBe(true);

    const duplicate = await request(app)
      .post(`/api/posts/${alicePost.id}/applications`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(duplicate.status).toBe(409);

    const forbiddenList = await request(app)
      .get(`/api/posts/${alicePost.id}/applications`)
      .set("Authorization", `Bearer ${carolToken}`);
    expect(forbiddenList.status).toBe(403);

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
    const sessionId = accepted.body.data.session.id;

    const aliceMessage = await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ content: "你好，我们几点见？" });
    expect(aliceMessage.status).toBe(200);

    const bobMessages = await request(app)
      .get(`/api/sessions/${sessionId}/messages`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(bobMessages.status).toBe(200);
    expect(bobMessages.body.data.messages.some((item: { content: string }) => item.content === "你好，我们几点见？")).toBe(true);
    expect(bobMessages.body.data.session.contactVisible).toBe(false);
    expect(bobMessages.body.data.session.peer.wechatId).toBeUndefined();

    const aliceShare = await request(app)
      .post(`/api/sessions/${sessionId}/exchange-contact`)
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(aliceShare.status).toBe(200);
    expect(aliceShare.body.data.session.contactVisible).toBe(false);

    const bobShare = await request(app)
      .post(`/api/sessions/${sessionId}/exchange-contact`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(bobShare.status).toBe(200);
    expect(bobShare.body.data.session.contactVisible).toBe(true);
    expect(bobShare.body.data.session.peer.wechatId).toBeTruthy();

    const forbiddenMessages = await request(app)
      .get(`/api/sessions/${sessionId}/messages`)
      .set("Authorization", `Bearer ${carolToken}`);
    expect(forbiddenMessages.status).toBe(404);

    const cancelMissingReason = await request(app)
      .post(`/api/sessions/${sessionId}/cancel`)
      .set("Authorization", `Bearer ${bobToken}`)
      .send({});
    expect(cancelMissingReason.status).toBe(400);

    const cancelled = await request(app)
      .post(`/api/sessions/${sessionId}/cancel`)
      .set("Authorization", `Bearer ${bobToken}`)
      .send({ reason: "临时有事，改天再约" });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.session.status).toBe("closed");

    const postAfterCancel = await prisma.post.findUnique({ where: { id: alicePost.id } });
    expect(postAfterCancel?.status).toBe("published");

    const bobMessagesAfterCancel = await request(app)
      .get(`/api/sessions/${sessionId}/messages`)
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(bobMessagesAfterCancel.status).toBe(200);
    expect(
      bobMessagesAfterCancel.body.data.messages.some(
        (item: { content: string; isMine: boolean }) =>
          item.content === "【取消约好】理由：临时有事，改天再约" && !item.isMine
      )
    ).toBe(true);
    expect(bobMessagesAfterCancel.body.data.session.status).toBe("closed");

    const aliceCalendar = await request(app)
      .get("/api/calendar/events")
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(aliceCalendar.status).toBe(200);
    expect(
      aliceCalendar.body.data.events.some(
        (item: { type: string; postId: number }) => item.type === "matched" && item.postId === alicePost.id
      )
    ).toBe(false);
    expect(
      aliceCalendar.body.data.events.some(
        (item: { type: string; postId: number; status: string }) =>
          item.type === "published" && item.postId === alicePost.id && item.status === "published"
      )
    ).toBe(true);

    const bobCalendar = await request(app)
      .get("/api/calendar/events")
      .set("Authorization", `Bearer ${bobToken}`);
    expect(bobCalendar.status).toBe(200);
    expect(
      bobCalendar.body.data.events.some(
        (item: { type: string; postId: number }) => item.postId === alicePost.id
      )
    ).toBe(false);

    const afterClose = await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ content: "关闭后不能发" });
    expect(afterClose.status).toBe(409);

    const duplicateCancel = await request(app)
      .post(`/api/sessions/${sessionId}/cancel`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ reason: "再次取消" });
    expect(duplicateCancel.status).toBe(409);
  });
});
