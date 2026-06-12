import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { fail } from "../utils/http.js";

export type AuthedRequest = Request & {
  user?: {
    id: number;
    mockOpenId: string;
  };
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.header("Authorization")?.replace(/^Bearer\s+/i, "") ?? req.header("x-demo-token");
  if (!token) {
    return fail(res, 401, 40100, "未登录或 Token 缺失");
  }

  const userId = Number(token.replace("mock-token-", ""));
  if (!Number.isInteger(userId)) {
    return fail(res, 401, 40100, "Token 无效");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "active") {
    return fail(res, 401, 40100, "用户不存在或不可用");
  }

  req.user = { id: user.id, mockOpenId: user.mockOpenId };
  return next();
}
