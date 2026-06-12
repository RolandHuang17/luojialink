import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { fail, ok } from "../utils/http.js";

export const reportsRouter = Router();

const createReportSchema = z.object({
  targetType: z.enum(["post", "session", "message", "user", "ai"]),
  targetId: z.number().int().positive(),
  reason: z.string().min(1).max(64),
  detail: z.string().max(300).optional(),
});

reportsRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createReportSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, 400, 40001, "举报参数错误", parsed.error.flatten());
  }

  const report = await prisma.report.create({
    data: {
      reporterId: req.user!.id,
      ...parsed.data,
    },
  });
  return ok(res, { report });
});
