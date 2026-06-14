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

const accountMap: Record<string, string> = {
  alice: "mock_alice",
  bob: "mock_bob",
  carol: "mock_carol",
  newbie: "mock_newbie",
};

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

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  return ok(res, { user: await getProfile(req.user!.id) });
});

authRouter.post("/logout", requireAuth, async (_req, res) => {
  return ok(res, { loggedOut: true });
});
