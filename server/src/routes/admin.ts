import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { ok } from "../utils/http.js";

export const adminRouter = Router();

adminRouter.get("/reports", requireAuth, async (_req, res) => {
  const reports = await prisma.report.findMany({
    include: { reporter: { select: { id: true, nickname: true, college: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, { reports });
});
