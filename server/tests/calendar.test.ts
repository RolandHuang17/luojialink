import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

const app = createApp();
const userIds: number[] = [];
const postIds: number[] = [];

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
      mockOpenId: `calendar_${suffix}_${Date.now()}_${Math.random()}`,
      studentNo: `cal_${suffix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      realName: `日历测试${suffix}`,
      nickname: `日历${suffix}`,
      college: "测试学院",
      grade: "2026",
      anonymousNo: `日历 ${suffix}`,
    },
  });
  userIds.push(user.id);
  return user;
}

async function cleanup() {
  await prisma.message.deleteMany({ where: { session: { postId: { in: postIds } } } });
  await prisma.tempSession.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.matchApplication.deleteMany({ where: { postId: { in: postIds } } });
  await prisma.post.deleteMany({ where: { id: { in: postIds } } });
  await prisma.calendarSlot.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  postIds.length = 0;
  userIds.length = 0;
}

describe("calendar", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it("saves slots, finds common free time, and reports conflicts", async () => {
    const alice = await createUser("alice");
    const bob = await createUser("bob");
    const carol = await createUser("carol");
    const date = tomorrowDateText();
    const post = await prisma.post.create({
      data: {
        publisherId: alice.id,
        category: "日历测试",
        startTime: localDateTime(date, "18:00"),
        endTime: localDateTime(date, "20:00"),
        locationPref: "测试地点",
        feePref: "AA",
        description: "用于日历共同空闲测试",
        anonymousName: alice.anonymousNo,
        expireTime: localDateTime(date, "17:30"),
      },
    });
    postIds.push(post.id);
    const session = await prisma.tempSession.create({
      data: {
        postId: post.id,
        userAId: alice.id,
        userBId: bob.id,
      },
    });

    const invalid = await request(app)
      .put("/api/calendar/slots")
      .set("Authorization", `Bearer ${tokenOf(alice.id)}`)
      .send({ slots: [{ date, startTime: "20:00", endTime: "18:00", status: "available" }] });
    expect(invalid.status).toBe(400);

    const aliceSave = await request(app)
      .put("/api/calendar/slots")
      .set("Authorization", `Bearer ${tokenOf(alice.id)}`)
      .send({
        slots: [
          { date, startTime: "17:30", endTime: "19:30", status: "available" },
          { date, startTime: "18:30", endTime: "19:00", status: "busy" },
        ],
      });
    expect(aliceSave.status).toBe(200);
    expect(aliceSave.body.data.slots).toHaveLength(2);

    const bobSave = await request(app)
      .put("/api/calendar/slots")
      .set("Authorization", `Bearer ${tokenOf(bob.id)}`)
      .send({ slots: [{ date, startTime: "18:45", endTime: "20:30", status: "available" }] });
    expect(bobSave.status).toBe(200);

    const slots = await request(app).get("/api/calendar/slots").set("Authorization", `Bearer ${tokenOf(alice.id)}`);
    expect(slots.status).toBe(200);
    expect(slots.body.data.slots.some((slot: { status: string }) => slot.status === "busy")).toBe(true);

    const commonFree = await request(app)
      .get(`/api/calendar/common-free?sessionId=${session.id}`)
      .set("Authorization", `Bearer ${tokenOf(alice.id)}`);
    expect(commonFree.status).toBe(200);
    expect(commonFree.body.data.commonFree).toContainEqual({ date, startTime: "18:45", endTime: "19:30" });

    const forbidden = await request(app)
      .get(`/api/calendar/common-free?sessionId=${session.id}`)
      .set("Authorization", `Bearer ${tokenOf(carol.id)}`);
    expect(forbidden.status).toBe(404);

    const conflicts = await request(app)
      .get(`/api/calendar/conflicts?postId=${post.id}`)
      .set("Authorization", `Bearer ${tokenOf(alice.id)}`);
    expect(conflicts.status).toBe(200);
    expect(conflicts.body.data.hasConflict).toBe(true);
    expect(conflicts.body.data.blocksApply).toBe(false);
    expect(conflicts.body.data.busyConflicts[0].overlap).toEqual({ date, startTime: "18:30", endTime: "19:00" });
  });

  it("returns an empty common-free list when available slots do not overlap", async () => {
    const alice = await createUser("empty_alice");
    const bob = await createUser("empty_bob");
    const date = tomorrowDateText();
    const post = await prisma.post.create({
      data: {
        publisherId: alice.id,
        category: "日历测试",
        startTime: localDateTime(date, "18:00"),
        endTime: localDateTime(date, "20:00"),
        locationPref: "测试地点",
        feePref: "AA",
        description: "用于无共同空闲测试",
        anonymousName: alice.anonymousNo,
        expireTime: localDateTime(date, "17:30"),
      },
    });
    postIds.push(post.id);
    const session = await prisma.tempSession.create({ data: { postId: post.id, userAId: alice.id, userBId: bob.id } });

    await prisma.calendarSlot.createMany({
      data: [
        { userId: alice.id, date, startTime: "18:00", endTime: "18:30", status: "available" },
        { userId: bob.id, date, startTime: "19:00", endTime: "19:30", status: "available" },
      ],
    });

    const commonFree = await request(app)
      .get(`/api/calendar/common-free?sessionId=${session.id}`)
      .set("Authorization", `Bearer ${tokenOf(alice.id)}`);
    expect(commonFree.status).toBe(200);
    expect(commonFree.body.data.commonFree).toEqual([]);
  });
});
