import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { ok } from "../utils/http.js";

export const tagsRouter = Router();

tagsRouter.get("/", requireAuth, async (_req, res) => {
  const tags = await prisma.tag.findMany({
    where: { enabled: true },
    orderBy: [{ type: "asc" }, { id: "asc" }],
  });
  return ok(res, { tags });
});
