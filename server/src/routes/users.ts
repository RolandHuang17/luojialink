import { Router } from "express";
import { z } from "zod";
import {
  AGES,
  CAMPUSES,
  COLLEGES,
  DEFAULT_AVATAR_URL,
  GENDERS,
  GRADES,
  HOMETOWNS,
  PERSONAL_TRAITS,
  RELATION_EXPECTATIONS,
  isValidMbti,
} from "../domain/options.js";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { getProfile, serializeUser } from "../services/users.js";
import { fail, ok } from "../utils/http.js";

export const usersRouter = Router();

const profileSchema = z
  .object({
    college: z.enum(COLLEGES),
    grade: z.enum(GRADES),
    age: z.number().int().refine((value) => AGES.includes(value as (typeof AGES)[number]), "年龄不在可选范围内"),
    nickname: z.string().trim().min(1).max(24),
    avatarUrl: z.string().trim().min(1).max(300).default(DEFAULT_AVATAR_URL),
    gender: z.enum(GENDERS),
    hometown: z.enum(HOMETOWNS),
    wechatId: z.string().trim().min(1).max(64),
    campus: z.enum(CAMPUSES),
    mbti: z.string().trim().refine(isValidMbti, "MBTI 格式必须为四维结果"),
    relationExpectation: z.enum(RELATION_EXPECTATIONS),
    bio: z.string().trim().min(1).max(80),
    hobbies: z.string().trim().min(1).max(120),
    favoriteThings: z.string().trim().min(1).max(160),
    messageToPeer: z.string().trim().min(1).max(120),
    dealBreakers: z.string().trim().min(1).max(120),
    personalTraits: z
      .array(z.enum(PERSONAL_TRAITS))
      .length(3, "个人特质必须且只能选择 3 个")
      .refine((items) => new Set(items).size === 3, "个人特质不能重复"),
  })
  .strict();

const partialProfileSchema = profileSchema.partial().extend({
  personalTraits: z
    .array(z.enum(PERSONAL_TRAITS))
    .length(3, "个人特质必须且只能选择 3 个")
    .refine((items) => new Set(items).size === 3, "个人特质不能重复")
    .optional(),
});

const updateTagsSchema = z.object({
  tagIds: z.array(z.number().int().positive()).max(12),
});

function parsePositiveId(value: string | string[] | undefined) {
  if (Array.isArray(value) || !value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function toUserData(data: z.infer<typeof partialProfileSchema>, onboardingCompleted?: boolean) {
  return {
    ...data,
    personalTraits: data.personalTraits ? JSON.stringify(data.personalTraits) : undefined,
    onboardingCompleted,
  };
}

usersRouter.get("/options", requireAuth, async (_req, res) => {
  return ok(res, {
    colleges: COLLEGES,
    grades: GRADES,
    ages: AGES,
    genders: GENDERS,
    hometowns: HOMETOWNS,
    campuses: CAMPUSES,
    relationExpectations: RELATION_EXPECTATIONS,
    personalTraits: PERSONAL_TRAITS,
  });
});

usersRouter.get("/me/profile", requireAuth, async (req: AuthedRequest, res) => {
  return ok(res, { user: await getProfile(req.user!.id) });
});

usersRouter.put("/me/onboarding", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = profileSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, 400, 40001, "注册资料不完整或存在非法选项", parsed.error.flatten());
  }

  await prisma.user.update({
    where: { id: req.user!.id },
    data: toUserData(parsed.data, true),
  });
  return ok(res, { user: await getProfile(req.user!.id) });
});

usersRouter.put("/me/profile", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = partialProfileSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, 400, 40001, "资料参数错误", parsed.error.flatten());
  }

  await prisma.user.update({ where: { id: req.user!.id }, data: toUserData(parsed.data) });
  return ok(res, { user: await getProfile(req.user!.id) });
});

usersRouter.get("/:id/homepage", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) {
    return fail(res, 400, 40001, "用户 ID 无效");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return fail(res, 404, 40400, "用户不存在");
  }

  const contactVisible =
    id === req.user!.id ||
    (await prisma.tempSession.count({
      where: {
        status: "active",
        OR: [
          { userAId: req.user!.id, userBId: id, contactSharedByA: true, contactSharedByB: true },
          { userAId: id, userBId: req.user!.id, contactSharedByA: true, contactSharedByB: true },
        ],
      },
    })) > 0;

  return ok(res, {
    user: serializeUser(user, { includePrivate: id === req.user!.id, contactVisible }),
  });
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
