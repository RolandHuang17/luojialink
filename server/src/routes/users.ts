import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { fail, ok } from "../utils/http.js";
import { getProfile } from "../services/users.js";

export const usersRouter = Router();

const updateProfileSchema = z.object({
  nickname: z.string().min(1).max(24).optional(),
  college: z.string().min(1).max(64).optional(),
  grade: z.string().min(1).max(16).optional(),
});

const updateTagsSchema = z.object({
  tagIds: z.array(z.number().int().positive()).max(12),
});

usersRouter.get("/me/profile", requireAuth, async (req: AuthedRequest, res) => {
  return ok(res, { user: await getProfile(req.user!.id) });
});

usersRouter.put("/me/profile", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = updateProfileSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, 400, 40001, "资料参数错误", parsed.error.flatten());
  }

  await prisma.user.update({ where: { id: req.user!.id }, data: parsed.data });
  return ok(res, { user: await getProfile(req.user!.id) });
});

usersRouter.put("/me/tags", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = updateTagsSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, 400, 40001, "标签参数错误", parsed.error.flatten());
  }

  const existing = await prisma.tag.findMany({ where: { id: { in: parsed.data.tagIds }, enabled: true } });
  if (existing.length !== parsed.data.tagIds.length) {
    return fail(res, 400, 40001, "存在不可用标签");
  }

  await prisma.$transaction([
    prisma.userTag.deleteMany({ where: { userId: req.user!.id } }),
    ...parsed.data.tagIds.map((tagId) =>
      prisma.userTag.create({ data: { userId: req.user!.id, tagId, weight: 1 } })
    ),
  ]);

  return ok(res, { user: await getProfile(req.user!.id) });
});
