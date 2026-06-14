import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

const app = createApp();
const postIds: number[] = [];
const userIds: number[] = [];

async function createUser(suffix: string) {
  const user = await prisma.user.create({
    data: {
      mockOpenId: `rules_${suffix}_${Date.now()}_${Math.random()}`,
      studentNo: `rules_${suffix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      realName: `规则${suffix}`,
      nickname: `规则${suffix}`,
      college: "计算机学院",
      grade: "2025",
      anonymousNo: `规则${suffix}`,
      wechatId: `rules_${suffix}`,
      personalTraits: JSON.stringify(["善良", "坦诚", "幽默"]),
    },
  });
  userIds.push(user.id);
  return user;
}

function tokenOf(userId: number) {
  return `mock-token-${userId}`;
}

function makeTime(days: number, hour: number) {
  const value = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  value.setHours(hour, 0, 0, 0);
  return value;
}

function payload(days: number, startHour: number, endHour: number) {
  return {
    title: `规则测试 ${days}-${startHour}`,
    detail: "用于产品规则测试",
    category: "吃饭",
    activityLocation: "测试地点",
    startTime: makeTime(days, startHour).toISOString(),
    endTime: makeTime(days, endHour).toISOString(),
  };
}

async function createPublished(userId: number, days: number, startHour: number, endHour: number) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const post = await prisma.post.create({
    data: {
      publisherId: userId,
      title: "规则测试已有安排",
      detail: "用于冲突测试",
      category: "吃饭",
      activityLocation: "测试地点",
      locationPref: "测试地点",
      feePref: "AA",
      description: "用于冲突测试",
      startTime: makeTime(days, startHour),
      endTime: makeTime(days, endHour),
      anonymousName: user.anonymousNo,
      expireTime: makeTime(days, startHour - 1),
      status: "published",
    },
  });
  postIds.push(post.id);
  return post;
}

async function cleanup() {
  await prisma.message.deleteMany({ where: { session: { postId: { in: postIds } } } });
  await prisma.tempSession.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.matchApplication.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.post.deleteMany({ where: { id: { in: postIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  postIds.length = 0;
  userIds.length = 0;
}

describe("product rules", () => {
  afterEach(cleanup);

  it("validates onboarding required enums and exactly three traits", async () => {
    const newbie = await createUser("newbie");
    const invalid = await request(app)
      .put("/api/users/me/onboarding")
      .set("Authorization", `Bearer ${tokenOf(newbie.id)}`)
      .send({
        college: "不存在的学院",
        grade: "2025",
        age: 19,
        nickname: "新同学",
        avatarUrl: "https://dummyimage.com/160x160/1d6f5f/fff",
        gender: "保密",
        hometown: "湖北",
        wechatId: "newbie_whu",
        campus: "文理学部",
        mbti: "ENFP",
        relationExpectation: "搭子",
        bio: "你好",
        hobbies: "电影",
        favoriteThings: "风、书、咖啡",
        messageToPeer: "很高兴认识你",
        dealBreakers: "不尊重边界",
        personalTraits: ["善良", "幽默"],
      });
    expect(invalid.status).toBe(400);
  });

  it("limits active posts, future window, publish conflicts, and application conflicts", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const aliceToken = tokenOf(alice.id);
    const bobToken = tokenOf(bob.id);

    const tooLate = await request(app).post("/api/posts").set("Authorization", `Bearer ${aliceToken}`).send(payload(16, 10, 11));
    expect(tooLate.status).toBe(409);

    const existing = await createPublished(alice.id, 11, 10, 12);
    const conflict = await request(app).post("/api/posts").set("Authorization", `Bearer ${aliceToken}`).send(payload(11, 11, 13));
    expect(conflict.status).toBe(409);

    for (let index = 0; index < 5; index += 1) {
      await createPublished(bob.id, 5 + index, 8, 9);
    }
    const tooMany = await request(app).post("/api/posts").set("Authorization", `Bearer ${bobToken}`).send(payload(12, 8, 9));
    expect(tooMany.status).toBe(409);

    await createPublished(bob.id, 13, 10, 12);
    const aliceSameTime = await createPublished(alice.id, 13, 10, 12);
    const applicationConflict = await request(app)
      .post(`/api/posts/${aliceSameTime.id}/applications`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(applicationConflict.status).toBe(409);
  });
});
