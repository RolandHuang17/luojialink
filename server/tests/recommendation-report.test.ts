import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

const app = createApp();
const userIds: number[] = [];
const postIds: number[] = [];
const poiIds: number[] = [];

function tokenOf(userId: number) {
  return `mock-token-${userId}`;
}

function tomorrowDateText() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function localDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

async function createUser(suffix: string) {
  const user = await prisma.user.create({
    data: {
      mockOpenId: `step05_${suffix}_${Date.now()}_${Math.random()}`,
      studentNo: `step05_${suffix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      realName: `Step05 ${suffix}`,
      nickname: `Step05 ${suffix}`,
      college: "Demo College",
      grade: "2026",
      anonymousNo: `Step05 ${suffix}`,
    },
  });
  userIds.push(user.id);
  return user;
}

async function cleanup() {
  await prisma.report.deleteMany({ where: { reporterId: { in: userIds } } });
  await prisma.message.deleteMany({ where: { session: { postId: { in: postIds } } } });
  await prisma.tempSession.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.matchApplication.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.post.deleteMany({ where: { id: { in: postIds } } });
  await prisma.calendarSlot.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.poi.deleteMany({ where: { id: { in: poiIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  userIds.length = 0;
  postIds.length = 0;
  poiIds.length = 0;
}

describe("recommendations, pois, and reports", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it("queries pois and returns a template recommendation for session members", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const carol = await createUser("carol");
    const date = tomorrowDateText();
    const post = await prisma.post.create({
      data: {
        publisherId: alice.id,
        category: "Step05Food",
        startTime: localDateTime(date, "18:00"),
        endTime: localDateTime(date, "20:00"),
        locationPref: "Step05 Lake",
        feePref: "AA",
        description: "Step05 recommendation test",
        anonymousName: alice.anonymousNo,
        expireTime: localDateTime(date, "17:30"),
      },
    });
    postIds.push(post.id);

    const poi = await prisma.poi.create({
      data: {
        name: "Step05 Lake Canteen",
        category: "Step05Food",
        location: "Step05 Lake",
        rating: 4.8,
        tags: "Step05Food,budget",
      },
    });
    poiIds.push(poi.id);

    const session = await prisma.tempSession.create({
      data: { postId: post.id, userAId: alice.id, userBId: bob.id },
    });
    await prisma.calendarSlot.createMany({
      data: [
        { userId: alice.id, date, startTime: "18:00", endTime: "19:30", status: "available" },
        { userId: bob.id, date, startTime: "18:30", endTime: "20:00", status: "available" },
      ],
    });

    const pois = await request(app)
      .get("/api/pois?category=Step05Food&keyword=Lake")
      .set("Authorization", `Bearer ${tokenOf(alice.id)}`);
    expect(pois.status).toBe(200);
    expect(pois.body.data.pois.some((item: { id: number }) => item.id === poi.id)).toBe(true);

    const recommendation = await request(app)
      .get(`/api/recommendations/session/${session.id}`)
      .set("Authorization", `Bearer ${tokenOf(alice.id)}`);
    expect(recommendation.status).toBe(200);
    expect(recommendation.body.data.recommendation.sourceType).toBe("template");
    expect(recommendation.body.data.recommendation.timeSuggestion.fromCommonFree).toBe(true);
    expect(recommendation.body.data.recommendation.placeSuggestion.name).toBe("Step05 Lake Canteen");
    expect(recommendation.body.data.recommendation.icebreaker).toBeTruthy();
    expect(recommendation.body.data.recommendation.icebreakers.length).toBeGreaterThanOrEqual(2);
    expect(recommendation.body.data.recommendation.sourceLabel).toBeTruthy();
    expect(recommendation.body.data.commonFree).toContainEqual({ date, startTime: "18:30", endTime: "19:30" });

    const forbidden = await request(app)
      .get(`/api/recommendations/session/${session.id}`)
      .set("Authorization", `Bearer ${tokenOf(carol.id)}`);
    expect(forbidden.status).toBe(404);
  });

  it("creates reports and rejects invalid report input", async () => {
    const alice = await createUser("reporter");

    const created = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${tokenOf(alice.id)}`)
      .send({ targetType: "user", targetId: alice.id, reason: "spam", detail: "demo report" });
    expect(created.status).toBe(200);
    expect(created.body.data.report.reason).toBe("spam");
    expect(created.body.data.report.reporterId).toBe(alice.id);

    const invalid = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${tokenOf(alice.id)}`)
      .send({ targetType: "user", targetId: 0, reason: "" });
    expect(invalid.status).toBe(400);
  });
});
