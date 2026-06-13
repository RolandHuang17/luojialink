import type { CalendarSlot, Poi, Post } from "@prisma/client";
import { Router } from "express";
import { env } from "../config/env.js";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { fail, ok } from "../utils/http.js";

export const recommendationsRouter = Router();

type TimeWindow = {
  date: string;
  startTime: string;
  endTime: string;
};

function parsePositiveId(value: string | string[] | undefined) {
  if (Array.isArray(value) || !value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(value: number) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toLocalDateText(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalTimeText(value: Date) {
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function buildPostWindows(start: Date, end: Date): TimeWindow[] {
  const startDate = toLocalDateText(start);
  const endDate = toLocalDateText(end);
  if (startDate === endDate) {
    return [{ date: startDate, startTime: toLocalTimeText(start), endTime: toLocalTimeText(end) }];
  }

  const windows: TimeWindow[] = [{ date: startDate, startTime: toLocalTimeText(start), endTime: "23:59" }];
  let cursor = addDays(start, 1);
  while (toLocalDateText(cursor) < endDate) {
    windows.push({ date: toLocalDateText(cursor), startTime: "00:00", endTime: "23:59" });
    cursor = addDays(cursor, 1);
  }
  windows.push({ date: endDate, startTime: "00:00", endTime: toLocalTimeText(end) });
  return windows;
}

function intersect(a: TimeWindow, b: TimeWindow, c: TimeWindow) {
  if (a.date !== b.date || a.date !== c.date) return null;
  const start = Math.max(timeToMinutes(a.startTime), timeToMinutes(b.startTime), timeToMinutes(c.startTime));
  const end = Math.min(timeToMinutes(a.endTime), timeToMinutes(b.endTime), timeToMinutes(c.endTime));
  if (start >= end) return null;
  return { date: a.date, startTime: minutesToTime(start), endTime: minutesToTime(end) };
}

function calculateCommonFree(userASlots: CalendarSlot[], userBSlots: CalendarSlot[], post: Post) {
  const postWindows = buildPostWindows(post.startTime, post.endTime);
  const commonFree: TimeWindow[] = [];

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

  return commonFree.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
}

function splitTags(tags: string) {
  return tags
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function includesText(source: string | null | undefined, target: string) {
  return (source ?? "").toLowerCase().includes(target.toLowerCase());
}

function rankPoi(poi: Poi, post: Post) {
  let score = poi.rating ?? 0;
  if (poi.category === post.category) score += 20;
  if (includesText(poi.tags, post.category)) score += 8;
  if (includesText(post.locationPref, poi.location) || includesText(poi.location, post.locationPref)) score += 6;
  if (includesText(poi.name, post.locationPref) || includesText(post.locationPref, poi.name)) score += 6;
  return score;
}

async function findRecommendedPois(post: Post) {
  const pois = await prisma.poi.findMany();
  return pois
    .map((poi) => ({ poi, relevanceScore: rankPoi(poi, post) }))
    .filter((item) => item.relevanceScore > (item.poi.rating ?? 0) || item.poi.category === post.category)
    .sort((a, b) => b.relevanceScore - a.relevanceScore || (b.poi.rating ?? 0) - (a.poi.rating ?? 0))
    .slice(0, 3);
}

function formatPoi(poi: Poi, relevanceScore: number) {
  return {
    id: poi.id,
    name: poi.name,
    category: poi.category,
    location: poi.location,
    rating: poi.rating,
    tags: splitTags(poi.tags),
    relevanceScore: Number(relevanceScore.toFixed(1)),
  };
}

function tagNamesOf(user: { tags: { tag: { name: string } }[] }) {
  return user.tags.map((item) => item.tag.name);
}

function findCommonNames(a: string[], b: string[]) {
  const bNames = new Set(b);
  return a.filter((name) => bNames.has(name));
}

function fallbackTimeWindow(post: Post) {
  return {
    date: toLocalDateText(post.startTime),
    startTime: toLocalTimeText(post.startTime),
    endTime: toLocalTimeText(post.endTime),
  };
}

recommendationsRouter.get("/session/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) {
    return fail(res, 400, 40001, "会话 ID 无效");
  }

  const session = await prisma.tempSession.findFirst({
    where: {
      id,
      OR: [{ userAId: req.user!.id }, { userBId: req.user!.id }],
    },
    include: {
      post: true,
      userA: { include: { tags: { include: { tag: true } } } },
      userB: { include: { tags: { include: { tag: true } } } },
    },
  });
  if (!session) {
    return fail(res, 404, 40400, "会话不存在或无权访问");
  }

  const [userASlots, userBSlots, rankedPois] = await Promise.all([
    prisma.calendarSlot.findMany({ where: { userId: session.userAId, status: "available" } }),
    prisma.calendarSlot.findMany({ where: { userId: session.userBId, status: "available" } }),
    findRecommendedPois(session.post),
  ]);

  const commonFree = calculateCommonFree(userASlots, userBSlots, session.post);
  const selectedTime = commonFree[0] ?? fallbackTimeWindow(session.post);
  const selectedPoi = rankedPois[0]?.poi;
  const userATags = tagNamesOf(session.userA);
  const userBTags = tagNamesOf(session.userB);
  const commonTags = findCommonNames(userATags, userBTags);
  const tagText = commonTags.length > 0 ? commonTags.slice(0, 3).join("、") : session.post.category;
  const placeText = selectedPoi ? `${selectedPoi.name}（${selectedPoi.location}）` : session.post.locationPref;

  return ok(res, {
    recommendation: {
      sessionId: session.id,
      postId: session.postId,
      sourceType: env.aiMode === "template" ? "template" : env.aiMode,
      fallback: true,
      timeSuggestion: {
        ...selectedTime,
        text: `${selectedTime.date} ${selectedTime.startTime}-${selectedTime.endTime}`,
        fromCommonFree: commonFree.length > 0,
      },
      placeSuggestion: selectedPoi
        ? formatPoi(selectedPoi, rankedPois[0].relevanceScore)
        : {
            id: null,
            name: session.post.locationPref,
            category: session.post.category,
            location: session.post.locationPref,
            rating: null,
            tags: [],
            relevanceScore: 0,
          },
      icebreaker: `可以先确认 ${placeText} 是否方便，再聊聊你们都关联的「${tagText}」。`,
      notes: [
        commonFree.length > 0 ? "已优先选择双方日历的共同空闲时间。" : "双方日历暂无重叠，建议先在会话中确认时间。",
        selectedPoi ? "地点来自本地 mock POI，可离线演示。" : "暂无匹配 POI，先使用发布者填写的地点偏好。",
        session.status === "active" ? "会话处于进行中，可以继续发送消息确认细节。" : "会话已关闭，仅用于回看安排。",
      ],
      generatedAt: new Date().toISOString(),
    },
    commonFree,
    pois: rankedPois.map((item) => formatPoi(item.poi, item.relevanceScore)),
  });
});
