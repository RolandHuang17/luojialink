import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { fail, ok } from "../utils/http.js";
import { getProfile } from "../services/users.js";

export const authRouter = Router();

const loginSchema = z.object({
  account: z.string().min(1).default("alice"),
});

const phoneLoginSchema = z.object({
  phoneNumber: z.string().trim().max(32).optional(),
  phoneCode: z.string().trim().max(256).optional(),
});

const phoneRegisterSchema = z.object({
  phoneNumber: z.string().trim().min(4).max(32),
  nickname: z.string().trim().min(1).max(16).optional(),
});

const accountMap: Record<string, string> = {
  alice: "mock_alice",
  bob: "mock_bob",
  carol: "mock_carol",
  newbie: "mock_newbie",
};

async function createLocalWechatUser(prefix = "wechat", fixedOpenId?: string, phoneNumber?: string, nickname?: string) {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const shortNo = String(Date.now()).slice(-4);
  const mockOpenId = fixedOpenId ?? `${prefix}_${suffix}`;

  return prisma.user.create({
    data: {
      mockOpenId,
      studentNo: mockOpenId,
      realName: nickname ?? "新同学",
      nickname: nickname ?? `珞珈同学${shortNo}`,
      avatarUrl: "https://dummyimage.com/160x160/1d6f5f/ffffff&text=L",
      college: "经济与管理学院",
      grade: "大一",
      age: 19,
      gender: "保密",
      hometown: "湖北",
      phoneNumber,
      wechatId: phoneNumber ?? `${prefix}_${suffix}`,
      campus: "文理学部",
      mbti: "ENFP",
      relationExpectation: "搭子",
      bio: "待填写",
      hobbies: "待填写",
      favoriteThings: "待填写",
      messageToPeer: "待填写",
      dealBreakers: "待填写",
      personalTraits: JSON.stringify([]),
      onboardingCompleted: false,
      anonymousNo: `珞珈 ${shortNo}`,
    },
  });
}

function normalizePhone(value?: string) {
  if (!value) return "";
  return value.replace(/\s|-/g, "");
}

function localPhoneKey(phoneNumber: string) {
  return `phone_${phoneNumber}`;
}

authRouter.post("/mock-login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, 400, 40001, "登录参数错误", parsed.error.flatten());
  }

  const mockOpenId = accountMap[parsed.data.account] ?? parsed.data.account;
  const user = await prisma.user.findUnique({ where: { mockOpenId } });
  if (!user) {
    return fail(res, 404, 40400, "测试账号不存在，请先执行 seed");
  }

  return ok(res, {
    token: `mock-token-${user.id}`,
    user: await getProfile(user.id),
  });
});

authRouter.post("/wechat-login", async (req, res) => {
  const parsed = phoneLoginSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, 400, 40001, "手机号登录参数错误", parsed.error.flatten());
  }

  const phoneNumber = normalizePhone(parsed.data.phoneNumber);
  if (!phoneNumber && !parsed.data.phoneCode) {
    return fail(res, 400, 40001, "请输入手机号");
  }
  const loginKey = phoneNumber || `code_${parsed.data.phoneCode ?? "local"}`;
  const mockOpenId = localPhoneKey(loginKey);
  const user =
    (phoneNumber ? await prisma.user.findUnique({ where: { phoneNumber } }) : null) ??
    (await prisma.user.findUnique({ where: { mockOpenId } }));

  if (!user) {
    return fail(res, 404, 40400, "这个手机号还没注册");
  }

  return ok(res, {
    token: `mock-token-${user.id}`,
    user: await getProfile(user.id),
  });
});

authRouter.post("/wechat-register", async (req, res) => {
  const parsed = phoneRegisterSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, 400, 40001, "注册信息不完整", parsed.error.flatten());
  }

  const phoneNumber = normalizePhone(parsed.data.phoneNumber);
  const existing = await prisma.user.findUnique({ where: { phoneNumber } });
  if (existing) {
    return fail(res, 409, 40900, "这个手机号已经注册过了");
  }

  const user = await createLocalWechatUser("phone_register", localPhoneKey(phoneNumber), phoneNumber, parsed.data.nickname);
  return ok(res, {
    token: `mock-token-${user.id}`,
    user: await getProfile(user.id),
  });
});

authRouter.post("/mock-register", async (_req, res) => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const shortNo = String(Date.now()).slice(-4);

  const user = await prisma.user.create({
    data: {
      mockOpenId: `mock_demo_${suffix}`,
      studentNo: `demo_${suffix}`,
      realName: "新同学",
      nickname: `测试同学${shortNo}`,
      avatarUrl: "https://dummyimage.com/160x160/8b9eb7/ffffff&text=T",
      college: "经济与管理学院",
      grade: "大一",
      age: 19,
      gender: "保密",
      hometown: "湖北",
      wechatId: `demo_${suffix}`,
      campus: "文理学部",
      mbti: "ENFP",
      relationExpectation: "搭子",
      bio: "待填写",
      hobbies: "待填写",
      favoriteThings: "待填写",
      messageToPeer: "待填写",
      dealBreakers: "待填写",
      personalTraits: JSON.stringify([]),
      onboardingCompleted: false,
      anonymousNo: `测试 ${shortNo}`,
    },
  });

  return ok(res, {
    token: `mock-token-${user.id}`,
    user: await getProfile(user.id),
  });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  return ok(res, { user: await getProfile(req.user!.id) });
});

authRouter.post("/logout", requireAuth, async (_req, res) => {
  return ok(res, { loggedOut: true });
});
