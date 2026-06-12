import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { fail, ok } from "../utils/http.js";

export const postsRouter = Router();

const createPostSchema = z.object({
  category: z.string().min(1).max(32),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  locationPref: z.string().min(1).max(128),
  feePref: z.string().min(1).max(64),
  description: z.string().min(1).max(300),
  anonymousFlag: z.boolean().default(true),
  expireTime: z.string().datetime(),
});

postsRouter.get("/", requireAuth, async (_req, res) => {
  const now = new Date();
  const posts = await prisma.post.findMany({
    where: {
      status: "published",
      expireTime: { gt: now },
    },
    include: {
      publisher: { select: { id: true, anonymousNo: true, nickname: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(res, {
    posts: posts.map((post) => ({
      id: post.id,
      category: post.category,
      startTime: post.startTime,
      endTime: post.endTime,
      locationPref: post.locationPref,
      feePref: post.feePref,
      description: post.description,
      anonymousName: post.anonymousName,
      expireTime: post.expireTime,
      status: post.status,
      publisher: {
        id: post.publisher.id,
        displayName: post.anonymousFlag ? post.anonymousName : post.publisher.nickname,
      },
    })),
  });
});

postsRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createPostSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, 400, 40001, "发布参数错误", parsed.error.flatten());
  }

  const activeCount = await prisma.post.count({
    where: {
      publisherId: req.user!.id,
      status: "published",
      expireTime: { gt: new Date() },
    },
  });
  if (activeCount >= env.postMaxActive) {
    return fail(res, 409, 40900, `同时有效请求不能超过 ${env.postMaxActive} 个`);
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  const post = await prisma.post.create({
    data: {
      publisherId: req.user!.id,
      category: parsed.data.category,
      startTime: new Date(parsed.data.startTime),
      endTime: new Date(parsed.data.endTime),
      locationPref: parsed.data.locationPref,
      feePref: parsed.data.feePref,
      description: parsed.data.description,
      anonymousFlag: parsed.data.anonymousFlag,
      anonymousName: user.anonymousNo,
      expireTime: new Date(parsed.data.expireTime),
    },
  });

  return ok(res, { post });
});

postsRouter.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      publisher: { select: { id: true, anonymousNo: true, nickname: true } },
    },
  });
  if (!post) {
    return fail(res, 404, 40400, "请求不存在");
  }
  return ok(res, {
    post: {
      ...post,
      publisher: {
        id: post.publisher.id,
        displayName: post.anonymousFlag ? post.anonymousName : post.publisher.nickname,
      },
    },
  });
});

postsRouter.post("/:id/cancel", requireAuth, async (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return fail(res, 404, 40400, "请求不存在");
  }
  if (post.publisherId !== req.user!.id) {
    return fail(res, 403, 40300, "无权取消该请求");
  }
  const updated = await prisma.post.update({ where: { id }, data: { status: "cancelled" } });
  return ok(res, { post: updated });
});
