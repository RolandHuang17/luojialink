import { Router } from "express";
import { prisma } from "../db.js";
import { ok } from "../utils/http.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const userCount = await prisma.user.count();
  return ok(res, {
    ok: true,
    service: "luojialink-server",
    userCount,
  });
});
