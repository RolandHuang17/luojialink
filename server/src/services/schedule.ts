import type { Prisma, PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type TimeRange = {
  startTime: Date;
  endTime: Date;
};

export type ScheduleConflict = {
  type: "published" | "applied" | "matched";
  postId: number;
  title: string;
  startTime: Date;
  endTime: Date;
  overlapStart: Date;
  overlapEnd: Date;
};

const ACTIVE_POST_STATUSES = ["published", "matched"];
const ACTIVE_APPLICATION_STATUSES = ["pending", "accepted"];

export function assertValidActivityWindow(startTime: Date, endTime: Date) {
  const now = new Date();
  const latest = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return "活动时间格式不正确";
  }
  if (startTime <= now) {
    return "活动开始时间必须晚于当前时间";
  }
  if (endTime <= startTime) {
    return "活动结束时间必须晚于开始时间";
  }
  if (startTime > latest) {
    return "活动开始时间不能超过未来 14 天";
  }
  return null;
}

export async function countActivePublishedPosts(db: DbClient, userId: number, excludePostId?: number) {
  return db.post.count({
    where: {
      publisherId: userId,
      status: { in: ACTIVE_POST_STATUSES },
      endTime: { gt: new Date() },
      ...(excludePostId ? { id: { not: excludePostId } } : {}),
    },
  });
}

export async function findUserScheduleConflicts(
  db: DbClient,
  userId: number,
  range: TimeRange,
  options: { excludePostId?: number; excludeApplicationId?: number } = {}
) {
  const conflicts: ScheduleConflict[] = [];

  const ownPosts = await db.post.findMany({
    where: {
      publisherId: userId,
      status: { in: ACTIVE_POST_STATUSES },
      ...(options.excludePostId ? { id: { not: options.excludePostId } } : {}),
    },
  });
  for (const post of ownPosts) {
    const overlap = getOverlap(range, post);
    if (overlap) {
      conflicts.push({
        type: post.status === "matched" ? "matched" : "published",
        postId: post.id,
        title: post.title || post.description,
        startTime: post.startTime,
        endTime: post.endTime,
        ...overlap,
      });
    }
  }

  const applications = await db.matchApplication.findMany({
    where: {
      applicantId: userId,
      status: { in: ACTIVE_APPLICATION_STATUSES },
      ...(options.excludeApplicationId ? { id: { not: options.excludeApplicationId } } : {}),
    },
    include: { post: true },
  });
  for (const application of applications) {
    const overlap = getOverlap(range, application.post);
    if (overlap) {
      conflicts.push({
        type: application.status === "accepted" ? "matched" : "applied",
        postId: application.post.id,
        title: application.post.title || application.post.description,
        startTime: application.post.startTime,
        endTime: application.post.endTime,
        ...overlap,
      });
    }
  }

  return conflicts;
}

export function formatConflictMessage(conflicts: ScheduleConflict[]) {
  const first = conflicts[0];
  if (!first) return "";
  const date = toDateText(first.overlapStart);
  const start = toTimeText(first.overlapStart);
  const end = toTimeText(first.overlapEnd);
  return `时间冲突：${date} ${start}-${end} 已有「${first.title}」，请调整时间`;
}

export async function assertCanPublish(db: DbClient, userId: number, range: TimeRange, excludePostId?: number) {
  const windowError = assertValidActivityWindow(range.startTime, range.endTime);
  if (windowError) return { ok: false as const, message: windowError, conflicts: [] };

  const activeCount = await countActivePublishedPosts(db, userId, excludePostId);
  if (activeCount >= env.postMaxActive) {
    return { ok: false as const, message: `同时有效想搭不能超过 ${env.postMaxActive} 个`, conflicts: [] };
  }

  const conflicts = await findUserScheduleConflicts(db, userId, range, { excludePostId });
  if (conflicts.length > 0) {
    return { ok: false as const, message: formatConflictMessage(conflicts), conflicts };
  }

  return { ok: true as const, message: "", conflicts: [] };
}

function getOverlap(range: TimeRange, post: { id: number; startTime: Date; endTime: Date }) {
  const overlapStart = new Date(Math.max(range.startTime.getTime(), post.startTime.getTime()));
  const overlapEnd = new Date(Math.min(range.endTime.getTime(), post.endTime.getTime()));
  if (overlapStart >= overlapEnd) return null;
  return { overlapStart, overlapEnd };
}

function toDateText(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function toTimeText(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}
