import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { fail, ok } from "../utils/http.js";

export const sessionsRouter = Router();

const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(500),
});

function parsePositiveId(value: string | string[] | undefined) {
  if (Array.isArray(value) || !value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function findAccessibleSession(sessionId: number, userId: number) {
  return prisma.tempSession.findFirst({
    where: {
      id: sessionId,
      OR: [{ userAId: userId }, { userBId: userId }],
    },
  });
}

sessionsRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const sessions = await prisma.tempSession.findMany({
    where: {
      OR: [{ userAId: req.user!.id }, { userBId: req.user!.id }],
    },
    include: {
      post: true,
      userA: { select: { id: true, nickname: true, college: true, grade: true, anonymousNo: true } },
      userB: { select: { id: true, nickname: true, college: true, grade: true, anonymousNo: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return ok(res, {
    sessions: sessions.map((session) => {
      const peer = session.userAId === req.user!.id ? session.userB : session.userA;
      return {
        id: session.id,
        postId: session.postId,
        status: session.status,
        expireTime: session.expireTime,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        post: {
          id: session.post.id,
          category: session.post.category,
          description: session.post.description,
          locationPref: session.post.locationPref,
          feePref: session.post.feePref,
          startTime: session.post.startTime,
          endTime: session.post.endTime,
        },
        peer,
        lastMessage: session.messages[0] ?? null,
      };
    }),
  });
});

sessionsRouter.get("/:id/messages", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) {
    return fail(res, 400, 40001, "会话 ID 无效");
  }

  const session = await findAccessibleSession(id, req.user!.id);
  if (!session) {
    return fail(res, 404, 40400, "会话不存在或无权访问");
  }

  const messages = await prisma.message.findMany({
    where: { sessionId: id },
    include: {
      sender: { select: { id: true, nickname: true, anonymousNo: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return ok(res, {
    session: {
      id: session.id,
      status: session.status,
      postId: session.postId,
    },
    messages: messages.map((message) => ({
      id: message.id,
      sessionId: message.sessionId,
      senderId: message.senderId,
      content: message.content,
      contentType: message.contentType,
      status: message.status,
      createdAt: message.createdAt,
      sender: message.sender,
      isMine: message.senderId === req.user!.id,
    })),
  });
});

sessionsRouter.post("/:id/messages", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) {
    return fail(res, 400, 40001, "会话 ID 无效");
  }

  const parsed = sendMessageSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return fail(res, 400, 40001, "消息参数错误", parsed.error.flatten());
  }

  const session = await findAccessibleSession(id, req.user!.id);
  if (!session) {
    return fail(res, 404, 40400, "会话不存在或无权访问");
  }
  if (session.status !== "active") {
    return fail(res, 409, 40900, "会话已关闭，不能继续发送消息");
  }

  const message = await prisma.message.create({
    data: {
      sessionId: id,
      senderId: req.user!.id,
      content: parsed.data.content,
      contentType: "text",
    },
    include: {
      sender: { select: { id: true, nickname: true, anonymousNo: true } },
    },
  });
  await prisma.tempSession.update({ where: { id }, data: { updatedAt: new Date() } });

  return ok(res, {
    message: {
      id: message.id,
      sessionId: message.sessionId,
      senderId: message.senderId,
      content: message.content,
      contentType: message.contentType,
      status: message.status,
      createdAt: message.createdAt,
      sender: message.sender,
      isMine: true,
    },
  });
});

sessionsRouter.post("/:id/close", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) {
    return fail(res, 400, 40001, "会话 ID 无效");
  }

  const session = await findAccessibleSession(id, req.user!.id);
  if (!session) {
    return fail(res, 404, 40400, "会话不存在或无权访问");
  }

  const updated = await prisma.tempSession.update({
    where: { id },
    data: { status: "closed" },
  });

  return ok(res, { session: updated });
});
