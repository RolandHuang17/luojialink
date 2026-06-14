import { Router } from "express";
import { z } from "zod";
import { POST_CATEGORIES, POST_STATUSES } from "../domain/options.js";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { assertCanPublish, findUserScheduleConflicts, formatConflictMessage } from "../services/schedule.js";
import { computeSimpleMatchScore, findCommonTags } from "../services/matching.js";
import { fail, ok } from "../utils/http.js";

export const postsRouter = Router();

const postPayloadSchema = z
  .object({
    title: z.string().trim().min(1).max(60).optional(),
    detail: z.string().trim().min(1).max(600).optional(),
    category: z.enum(POST_CATEGORIES),
    activityLocation: z.string().trim().min(1).max(128).optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    status: z.enum(POST_STATUSES).optional(),
    locationPref: z.string().trim().min(1).max(128).optional(),
    feePref: z.string().trim().max(64).optional(),
    description: z.string().trim().min(1).max(600).optional(),
    anonymousFlag: z.boolean().default(true),
    expireTime: z.string().datetime().optional(),
  })
  .strict();

const createApplicationSchema = z.object({
  applyMessage: z.string().trim().max(200).optional(),
});

function parsePositiveId(value: string | string[] | undefined) {
  if (Array.isArray(value) || !value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function buildPostPayload(data: z.infer<typeof postPayloadSchema>, fallbackStatus: "draft" | "published") {
  const title = data.title ?? data.description?.slice(0, 30) ?? data.category;
  const detail = data.detail ?? data.description ?? title;
  const activityLocation = data.activityLocation ?? data.locationPref ?? "武汉大学校内";
  const status = data.status ?? fallbackStatus;
  return {
    title,
    detail,
    category: data.category,
    startTime: new Date(data.startTime),
    endTime: new Date(data.endTime),
    activityLocation,
    locationPref: activityLocation,
    feePref: data.feePref ?? "AA",
    description: detail,
    anonymousFlag: data.anonymousFlag,
    expireTime: data.expireTime ? new Date(data.expireTime) : new Date(data.endTime),
    status,
  };
}

function serializePost(post: any, viewerId?: number) {
  const publisher = post.publisher;
  return {
    id: post.id,
    title: post.title || post.description,
    detail: post.detail || post.description,
    category: post.category,
    startTime: post.startTime,
    endTime: post.endTime,
    activityLocation: post.activityLocation || post.locationPref,
    locationPref: post.activityLocation || post.locationPref,
    feePref: post.feePref,
    description: post.detail || post.description,
    anonymousName: post.anonymousName,
    expireTime: post.expireTime,
    status: post.status,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    isMine: viewerId ? post.publisherId === viewerId : false,
    publisher: publisher
      ? {
          id: publisher.id,
          nickname: publisher.nickname,
          avatarUrl: publisher.avatarUrl,
          gender: publisher.gender,
          grade: publisher.grade,
          college: publisher.college,
          displayName: post.anonymousFlag ? post.anonymousName : publisher.nickname,
        }
      : undefined,
  };
}

async function assertPostWritable(postId: number, userId: number) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return { error: "想搭不存在" };
  if (post.publisherId !== userId) return { error: "无权操作该想搭" };
  return { post };
}

postsRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  if (category && !POST_CATEGORIES.includes(category as (typeof POST_CATEGORIES)[number])) {
    return fail(res, 400, 40001, "分类参数错误");
  }

  const posts = await prisma.post.findMany({
    where: {
      status: "published",
      endTime: { gt: new Date() },
      ...(category ? { category } : {}),
    },
    include: {
      publisher: {
        select: { id: true, nickname: true, avatarUrl: true, gender: true, grade: true, college: true, anonymousNo: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(res, { posts: posts.map((post) => serializePost(post, req.user!.id)) });
});

postsRouter.get("/mine", requireAuth, async (req: AuthedRequest, res) => {
  const posts = await prisma.post.findMany({
    where: { publisherId: req.user!.id, status: { not: "draft" } },
    include: { publisher: true },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, { posts: posts.map((post) => serializePost(post, req.user!.id)) });
});

postsRouter.get("/drafts", requireAuth, async (req: AuthedRequest, res) => {
  const drafts = await prisma.post.findMany({
    where: { publisherId: req.user!.id, status: "draft" },
    include: { publisher: true },
    orderBy: { updatedAt: "desc" },
  });
  return ok(res, { drafts: drafts.map((post) => serializePost(post, req.user!.id)) });
});

postsRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = postPayloadSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, 400, 40001, "发布参数错误", parsed.error.flatten());
  }

  const payload = buildPostPayload(parsed.data, "published");
  if (payload.status === "draft") {
    return createDraft(req, res, payload);
  }

  const validation = await assertCanPublish(prisma, req.user!.id, payload);
  if (!validation.ok) {
    return fail(res, 409, 40900, validation.message, { conflicts: validation.conflicts });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  const post = await prisma.post.create({
    data: {
      ...payload,
      anonymousName: user.anonymousNo,
      publisherId: req.user!.id,
    },
    include: { publisher: true },
  });
  return ok(res, { post: serializePost(post, req.user!.id) });
});

postsRouter.post("/drafts", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = postPayloadSchema.safeParse({ ...(req.body ?? {}), status: "draft" });
  if (!parsed.success) {
    return fail(res, 400, 40001, "草稿参数错误", parsed.error.flatten());
  }
  return createDraft(req, res, buildPostPayload(parsed.data, "draft"));
});

postsRouter.put("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "想搭 ID 无效");

  const writable = await assertPostWritable(id, req.user!.id);
  if ("error" in writable) return fail(res, 404, 40400, writable.error ?? "想搭不存在或无权操作");
  const parsed = postPayloadSchema.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, 40001, "想搭参数错误", parsed.error.flatten());

  const payload = buildPostPayload(parsed.data, writable.post.status === "draft" ? "draft" : "published");
  if (payload.status !== "draft") {
    const validation = await assertCanPublish(prisma, req.user!.id, payload, id);
    if (!validation.ok) return fail(res, 409, 40900, validation.message, { conflicts: validation.conflicts });
  }

  const post = await prisma.post.update({ where: { id }, data: payload, include: { publisher: true } });
  return ok(res, { post: serializePost(post, req.user!.id) });
});

postsRouter.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "想搭 ID 无效");
  const writable = await assertPostWritable(id, req.user!.id);
  if ("error" in writable) return fail(res, 404, 40400, writable.error ?? "想搭不存在或无权操作");
  if (writable.post.status !== "draft") return fail(res, 409, 40900, "只能删除草稿");
  await prisma.post.delete({ where: { id } });
  return ok(res, { deleted: true });
});

postsRouter.post("/:id/applications", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "想搭 ID 无效");

  const parsed = createApplicationSchema.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, 40001, "申请参数错误", parsed.error.flatten());

  const post = await prisma.post.findUnique({
    where: { id },
    include: { publisher: { include: { tags: { include: { tag: true } } } } },
  });
  if (!post) return fail(res, 404, 40400, "想搭不存在");
  if (post.publisherId === req.user!.id) return fail(res, 403, 40300, "不能申请自己发布的想搭");
  if (post.status !== "published" || post.endTime <= new Date()) return fail(res, 409, 40900, "该想搭已经不可申请");

  const conflicts = await findUserScheduleConflicts(prisma, req.user!.id, {
    startTime: post.startTime,
    endTime: post.endTime,
  });
  if (conflicts.length > 0) {
    return fail(res, 409, 40902, formatConflictMessage(conflicts), { conflicts });
  }

  const existing = await prisma.matchApplication.findUnique({
    where: { postId_applicantId: { postId: id, applicantId: req.user!.id } },
  });
  if (existing && existing.status !== "withdrawn") return fail(res, 409, 40901, "你已申请过该想搭");

  const applicant = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.id },
    include: { tags: { include: { tag: true } } },
  });
  const publisherTags = post.publisher.tags.map((item) => item.tag);
  const applicantTags = applicant.tags.map((item) => item.tag);
  const matchScore = computeSimpleMatchScore(publisherTags, applicantTags);
  const commonTags = findCommonTags(publisherTags, applicantTags);

  const application = existing
    ? await prisma.matchApplication.update({
        where: { id: existing.id },
        data: { status: "pending", applyMessage: parsed.data.applyMessage, matchScore },
      })
    : await prisma.matchApplication.create({
        data: { postId: id, applicantId: req.user!.id, applyMessage: parsed.data.applyMessage, matchScore },
      });

  return ok(res, {
    application: { ...application, commonTags },
  });
});

postsRouter.get("/:id/applications", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "想搭 ID 无效");

  const post = await prisma.post.findUnique({
    where: { id },
    include: { publisher: { include: { tags: { include: { tag: true } } } } },
  });
  if (!post) return fail(res, 404, 40400, "想搭不存在");
  if (post.publisherId !== req.user!.id) return fail(res, 403, 40300, "无权查看该想搭的申请");

  const publisherTags = post.publisher.tags.map((item) => item.tag);
  const applications = await prisma.matchApplication.findMany({
    where: { postId: id },
    include: { applicant: { include: { tags: { include: { tag: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return ok(res, {
    applications: applications.map((application) => {
      const applicantTags = application.applicant.tags.map((item) => item.tag);
      return {
        id: application.id,
        postId: application.postId,
        status: application.status,
        matchScore: application.matchScore,
        applyMessage: application.applyMessage,
        createdAt: application.createdAt,
        commonTags: findCommonTags(publisherTags, applicantTags),
        applicant: {
          id: application.applicant.id,
          nickname: application.applicant.nickname,
          avatarUrl: application.applicant.avatarUrl,
          gender: application.applicant.gender,
          college: application.applicant.college,
          grade: application.applicant.grade,
          anonymousNo: application.applicant.anonymousNo,
          tags: applicantTags,
        },
      };
    }),
  });
});

postsRouter.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "想搭 ID 无效");
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      publisher: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
          gender: true,
          grade: true,
          college: true,
          anonymousNo: true,
        },
      },
    },
  });
  if (!post) return fail(res, 404, 40400, "想搭不存在");
  return ok(res, { post: serializePost(post, req.user!.id) });
});

postsRouter.post("/:id/cancel", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "想搭 ID 无效");
  const writable = await assertPostWritable(id, req.user!.id);
  if ("error" in writable) return fail(res, 404, 40400, writable.error ?? "想搭不存在或无权操作");
  if (writable.post.status === "matched") return fail(res, 409, 40900, "已搭上的活动不能取消");
  const updated = await prisma.post.update({ where: { id }, data: { status: "cancelled" }, include: { publisher: true } });
  return ok(res, { post: serializePost(updated, req.user!.id) });
});

async function createDraft(req: AuthedRequest, res: any, payload: ReturnType<typeof buildPostPayload>) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  const post = await prisma.post.create({
    data: {
      ...payload,
      status: "draft",
      publisherId: req.user!.id,
      anonymousName: user.anonymousNo,
    },
    include: { publisher: true },
  });
  return ok(res, { draft: serializePost(post, req.user!.id), post: serializePost(post, req.user!.id) });
}
