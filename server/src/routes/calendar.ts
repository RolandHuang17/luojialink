import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { findUserScheduleConflicts } from "../services/schedule.js";
import { fail, ok } from "../utils/http.js";
import {
  type TimeWindow,
  timeToMinutes,
  minutesToTime,
  buildPostWindows,
  intersect,
} from "../utils/time.js";

export const calendarRouter = Router();

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const slotSchema = z.object({
  date: z.string().regex(datePattern),
  startTime: z.string().regex(timePattern),
  endTime: z.string().regex(timePattern),
  status: z.enum(["available", "busy"]),
});

const saveSlotsSchema = z.object({
  slots: z.array(slotSchema).max(40),
});

function parsePositiveId(value: unknown) {
  if (Array.isArray(value) || typeof value !== "string") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function assertValidSlotOrder(slots: z.infer<typeof slotSchema>[]) {
  return slots.every((slot) => timeToMinutes(slot.startTime) < timeToMinutes(slot.endTime));
}

function overlaps(a: TimeWindow, b: TimeWindow) {
  if (a.date !== b.date) return null;
  const start = Math.max(timeToMinutes(a.startTime), timeToMinutes(b.startTime));
  const end = Math.min(timeToMinutes(a.endTime), timeToMinutes(b.endTime));
  if (start >= end) return null;
  return { date: a.date, startTime: minutesToTime(start), endTime: minutesToTime(end) };
}

calendarRouter.get("/slots", requireAuth, async (req: AuthedRequest, res) => {
  const slots = await prisma.calendarSlot.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return ok(res, { slots });
});

calendarRouter.get("/events", requireAuth, async (req: AuthedRequest, res) => {
  const [published, applied, matchedSessions] = await Promise.all([
    prisma.post.findMany({
      where: {
        publisherId: req.user!.id,
        status: { in: ["published", "matched"] },
        endTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.matchApplication.findMany({
      where: {
        applicantId: req.user!.id,
        status: { in: ["pending", "accepted"] },
        post: { endTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      },
      include: { post: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.tempSession.findMany({
      where: {
        status: "active",
        post: { status: "matched", endTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        OR: [{ userAId: req.user!.id }, { userBId: req.user!.id }],
      },
      include: { post: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const publishedEvents = published.map((post) => ({
    id: `published-${post.id}`,
    type: "published",
    color: "red",
    postId: post.id,
    title: post.title || post.description,
    category: post.category,
    activityLocation: post.activityLocation || post.locationPref,
    startTime: post.startTime,
    endTime: post.endTime,
    status: post.status,
  }));
  const appliedEvents = applied.map((application) => ({
    id: `applied-${application.id}`,
    type: "applied",
    color: "blue",
    applicationId: application.id,
    postId: application.post.id,
    title: application.post.title || application.post.description,
    category: application.post.category,
    activityLocation: application.post.activityLocation || application.post.locationPref,
    startTime: application.post.startTime,
    endTime: application.post.endTime,
    status: application.status,
  }));
  const matchedEvents = matchedSessions.map((session) => ({
    id: `matched-${session.id}`,
    type: "matched",
    color: "green",
    sessionId: session.id,
    postId: session.post.id,
    title: session.post.title || session.post.description,
    category: session.post.category,
    activityLocation: session.post.activityLocation || session.post.locationPref,
    startTime: session.post.startTime,
    endTime: session.post.endTime,
    status: session.status,
  }));

  return ok(res, { events: [...publishedEvents, ...appliedEvents, ...matchedEvents] });
});

calendarRouter.put("/slots", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = saveSlotsSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, 400, 40001, "时间片参数错误", parsed.error.flatten());
  }
  if (!assertValidSlotOrder(parsed.data.slots)) {
    return fail(res, 400, 40002, "结束时间必须晚于开始时间");
  }

  await prisma.$transaction(async (tx) => {
    await tx.calendarSlot.deleteMany({ where: { userId: req.user!.id } });
    if (parsed.data.slots.length > 0) {
      await tx.calendarSlot.createMany({
        data: parsed.data.slots.map((slot) => ({
          userId: req.user!.id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: slot.status,
        })),
      });
    }
  });

  const slots = await prisma.calendarSlot.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return ok(res, { slots });
});

calendarRouter.get("/common-free", requireAuth, async (req: AuthedRequest, res) => {
  const sessionId = parsePositiveId(req.query.sessionId);
  if (!sessionId) {
    return fail(res, 400, 40001, "会话 ID 无效");
  }

  const session = await prisma.tempSession.findFirst({
    where: {
      id: sessionId,
      OR: [{ userAId: req.user!.id }, { userBId: req.user!.id }],
    },
    include: { post: true },
  });
  if (!session) {
    return fail(res, 404, 40400, "会话不存在或无权访问");
  }

  const [userASlots, userBSlots] = await Promise.all([
    prisma.calendarSlot.findMany({ where: { userId: session.userAId, status: "available" } }),
    prisma.calendarSlot.findMany({ where: { userId: session.userBId, status: "available" } }),
  ]);
  const postWindows = buildPostWindows(session.post.startTime, session.post.endTime);
  const commonFree = [];

  for (const window of postWindows) {
    const aSlots = userASlots.filter((slot) => slot.date === window.date);
    const bSlots = userBSlots.filter((slot) => slot.date === window.date);
    for (const aSlot of aSlots) {
      for (const bSlot of bSlots) {
        const result = intersect(aSlot, bSlot, window);
        if (result) commonFree.push(result);
      }
    }
  }

  commonFree.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  return ok(res, { commonFree });
});

calendarRouter.get("/conflicts", requireAuth, async (req: AuthedRequest, res) => {
  const postId = parsePositiveId(req.query.postId);
  if (!postId) {
    return fail(res, 400, 40001, "请求 ID 无效");
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return fail(res, 404, 40400, "请求不存在");
  }

  const scheduleConflicts = await findUserScheduleConflicts(
    prisma,
    req.user!.id,
    { startTime: post.startTime, endTime: post.endTime },
    { excludePostId: postId }
  );

  const busySlots = await prisma.calendarSlot.findMany({
    where: { userId: req.user!.id, status: "busy" },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  const postWindows = buildPostWindows(post.startTime, post.endTime);
  const busyConflicts = [];

  for (const window of postWindows) {
    for (const slot of busySlots.filter((item) => item.date === window.date)) {
      const overlap = overlaps(slot, window);
      if (overlap) {
        busyConflicts.push({ slot, overlap });
      }
    }
  }

  return ok(res, {
    hasConflict: scheduleConflicts.length > 0 || busyConflicts.length > 0,
    blocksApply: scheduleConflicts.length > 0,
    scheduleConflicts,
    busyConflicts,
    conflicts: busyConflicts,
  });
});
