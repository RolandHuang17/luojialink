import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { serializeUser } from "../services/users.js";
import { fail, ok } from "../utils/http.js";

export const sessionsRouter = Router();

const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(500),
});

const cancelSessionSchema = z.object({
  reason: z.string().trim().min(1, "请填写取消理由").max(200, "取消理由不能超过 200 字"),
});

function parsePositiveId(value: string | string[] | undefined) {
  if (Array.isArray(value) || !value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function findAccessibleSession(sessionId: number, userId: number) {
  return prisma.tempSession.findFirst({
    where: { id: sessionId, OR: [{ userAId: userId }, { userBId: userId }] },
    include: { userA: true, userB: true, post: true },
  });
}

function contactVisible(session: { contactSharedByA: boolean; contactSharedByB: boolean }) {
  return session.contactSharedByA && session.contactSharedByB;
}

function serializeSession(session: any, currentUserId: number) {
  const peer = session.userAId === currentUserId ? session.userB : session.userA;
  return {
    id: session.id,
    type: "session",
    postId: session.postId,
    status: session.status,
    expireTime: session.expireTime,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    contactSharedByMe: session.userAId === currentUserId ? session.contactSharedByA : session.contactSharedByB,
    contactSharedByPeer: session.userAId === currentUserId ? session.contactSharedByB : session.contactSharedByA,
    contactVisible: contactVisible(session),
    post: {
      id: session.post.id,
      title: session.post.title || session.post.description,
      detail: session.post.detail || session.post.description,
      category: session.post.category,
      activityLocation: session.post.activityLocation || session.post.locationPref,
      description: session.post.detail || session.post.description,
      locationPref: session.post.activityLocation || session.post.locationPref,
      feePref: session.post.feePref,
      startTime: session.post.startTime,
      endTime: session.post.endTime,
    },
    peer: serializeUser(peer, { contactVisible: contactVisible(session) }),
    lastMessage: session.messages?.[0] ?? null,
  };
}

function serializePendingApplication(application: any, currentUserId: number) {
  const isPublisher = application.post.publisherId === currentUserId;
  const peer = isPublisher ? application.applicant : application.post.publisher;
  return {
    id: application.id,
    type: "application",
    applicationId: application.id,
    postId: application.postId,
    status: application.status,
    applyMessage: application.applyMessage,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    isPublisher,
    post: {
      id: application.post.id,
      title: application.post.title || application.post.description,
      detail: application.post.detail || application.post.description,
      category: application.post.category,
      activityLocation: application.post.activityLocation || application.post.locationPref,
      startTime: application.post.startTime,
      endTime: application.post.endTime,
    },
    peer: serializeUser(peer),
    lastMessage: application.applyMessage ? { content: application.applyMessage, createdAt: application.createdAt } : null,
  };
}

sessionsRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const [sessions, applications] = await Promise.all([
    prisma.tempSession.findMany({
      where: { OR: [{ userAId: req.user!.id }, { userBId: req.user!.id }] },
      include: {
        post: true,
        userA: true,
        userB: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.matchApplication.findMany({
      where: {
        status: "pending",
        OR: [{ applicantId: req.user!.id }, { post: { publisherId: req.user!.id } }],
      },
      include: { applicant: true, post: { include: { publisher: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const items = [
    ...applications.map((item) => serializePendingApplication(item, req.user!.id)),
    ...sessions.map((item) => serializeSession(item, req.user!.id)),
  ].sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime());

  return ok(res, { sessions: sessions.map((item) => serializeSession(item, req.user!.id)), items });
});

sessionsRouter.get("/applications/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "申请 ID 无效");

  const application = await prisma.matchApplication.findFirst({
    where: {
      id,
      OR: [{ applicantId: req.user!.id }, { post: { publisherId: req.user!.id } }],
    },
    include: { applicant: true, post: { include: { publisher: true } } },
  });
  if (!application) return fail(res, 404, 40400, "申请不存在或无权访问");
  return ok(res, { application: serializePendingApplication(application, req.user!.id) });
});

sessionsRouter.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "会话 ID 无效");
  const session = await findAccessibleSession(id, req.user!.id);
  if (!session) return fail(res, 404, 40400, "会话不存在或无权访问");
  return ok(res, { session: serializeSession({ ...session, messages: [] }, req.user!.id) });
});

sessionsRouter.get("/:id/messages", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "会话 ID 无效");

  const session = await findAccessibleSession(id, req.user!.id);
  if (!session) return fail(res, 404, 40400, "会话不存在或无权访问");

  const messages = await prisma.message.findMany({
    where: { sessionId: id },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
  });

  return ok(res, {
    session: serializeSession({ ...session, messages: [] }, req.user!.id),
    messages: messages.map((message) => ({
      id: message.id,
      sessionId: message.sessionId,
      senderId: message.senderId,
      content: message.content,
      contentType: message.contentType,
      status: message.status,
      createdAt: message.createdAt,
      sender: serializeUser(message.sender),
      isMine: message.senderId === req.user!.id,
    })),
  });
});

sessionsRouter.post("/:id/messages", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "会话 ID 无效");

  const parsed = sendMessageSchema.safeParse(req.body ?? {});
  if (!parsed.success) return fail(res, 400, 40001, "消息参数错误", parsed.error.flatten());

  const session = await findAccessibleSession(id, req.user!.id);
  if (!session) return fail(res, 404, 40400, "会话不存在或无权访问");
  if (session.status !== "active") return fail(res, 409, 40900, "会话已关闭，不能继续发送消息");
  if (session.post.status !== "matched") return fail(res, 409, 40901, "申请通过前不能自由聊天");

  const message = await prisma.message.create({
    data: { sessionId: id, senderId: req.user!.id, content: parsed.data.content, contentType: "text" },
    include: { sender: true },
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
      sender: serializeUser(message.sender),
      isMine: true,
    },
  });
});

sessionsRouter.post("/:id/exchange-contact", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "会话 ID 无效");

  const session = await findAccessibleSession(id, req.user!.id);
  if (!session) return fail(res, 404, 40400, "会话不存在或无权访问");
  if (session.post.status !== "matched") return fail(res, 409, 40900, "只有成功搭上后才能互换联系方式");

  const data = session.userAId === req.user!.id ? { contactSharedByA: true } : { contactSharedByB: true };
  const updated = await prisma.tempSession.update({
    where: { id },
    data,
    include: { userA: true, userB: true, post: true },
  });

  await prisma.matchApplication.updateMany({
    where: { postId: updated.postId, status: "accepted" },
    data: { contactExchanged: updated.contactSharedByA && updated.contactSharedByB },
  });

  return ok(res, { session: serializeSession({ ...updated, messages: [] }, req.user!.id) });
});

sessionsRouter.post("/:id/cancel", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "会话 ID 无效");

  const parsed = cancelSessionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const reasonError = parsed.error.flatten().fieldErrors.reason?.[0];
    return fail(res, 400, 40001, reasonError || "取消参数错误", parsed.error.flatten());
  }

  const session = await findAccessibleSession(id, req.user!.id);
  if (!session) return fail(res, 404, 40400, "会话不存在或无权访问");
  if (session.status !== "active") return fail(res, 409, 40900, "这次约好已经取消");
  if (session.post.status !== "matched") return fail(res, 409, 40901, "只有已搭上的会话可以取消");

  const cancelContent = `【取消约好】理由：${parsed.data.reason}`;
  const result = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: { sessionId: id, senderId: req.user!.id, content: cancelContent, contentType: "text" },
      include: { sender: true },
    });
    const updated = await tx.tempSession.update({
      where: { id },
      data: { status: "closed", updatedAt: new Date() },
      include: { userA: true, userB: true, post: true },
    });
    await tx.post.update({ where: { id: session.postId }, data: { status: "published" } });
    await tx.matchApplication.updateMany({
      where: { postId: session.postId, status: "accepted" },
      data: { status: "cancelled" },
    });
    return { message, session: updated };
  });

  return ok(res, {
    session: serializeSession({ ...result.session, messages: [result.message] }, req.user!.id),
    message: {
      id: result.message.id,
      sessionId: result.message.sessionId,
      senderId: result.message.senderId,
      content: result.message.content,
      contentType: result.message.contentType,
      status: result.message.status,
      createdAt: result.message.createdAt,
      sender: serializeUser(result.message.sender),
      isMine: true,
    },
  });
});

sessionsRouter.post("/:id/close", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "会话 ID 无效");

  const session = await findAccessibleSession(id, req.user!.id);
  if (!session) return fail(res, 404, 40400, "会话不存在或无权访问");

  const updated = await prisma.tempSession.update({ where: { id }, data: { status: "closed" } });
  return ok(res, { session: updated });
});
