import { prisma } from "../db.js";

type SessionReadState = {
  id: number;
  userAId: number;
  lastReadAtA: Date | null;
  lastReadAtB: Date | null;
  lastActivityById: number | null;
  updatedAt: Date;
  messages?: Array<{ senderId: number; createdAt: Date }>;
};

type ApplicationReadState = {
  id: number;
  status: string;
  updatedAt: Date;
  viewedByApplicantAt: Date | null;
  viewedByPublisherAt: Date | null;
  post: { publisherId: number };
};

type AnonymousPost = {
  publisherId: number;
  anonymousFlag: boolean;
  anonymousName: string;
};

type PeerUser = {
  id: number;
  nickname: string;
};

export function readAtForSession(session: Pick<SessionReadState, "userAId" | "lastReadAtA" | "lastReadAtB">, currentUserId: number) {
  return session.userAId === currentUserId ? session.lastReadAtA : session.lastReadAtB;
}

export function hasUnreadSession(session: SessionReadState, currentUserId: number) {
  const readAt = readAtForSession(session, currentUserId);
  const lastMessage = session.messages?.[0] ?? null;
  if (lastMessage) {
    if (lastMessage.senderId === currentUserId) return false;
    if (!readAt) return true;
    return lastMessage.createdAt.getTime() > readAt.getTime();
  }
  if (!readAt) return session.lastActivityById !== currentUserId;
  if (!session.lastActivityById || session.lastActivityById === currentUserId) return false;
  return session.updatedAt.getTime() > readAt.getTime();
}

export function hasUnreadApplication(application: ApplicationReadState, currentUserId: number) {
  const isPublisher = application.post.publisherId === currentUserId;
  if (!isPublisher && application.status === "pending") return false;
  const viewedAt = isPublisher ? application.viewedByPublisherAt : application.viewedByApplicantAt;
  if (!viewedAt) return true;
  return application.updatedAt.getTime() > viewedAt.getTime();
}

export function displayNameForPeer(post: AnonymousPost, peer: PeerUser) {
  return post.anonymousFlag && post.publisherId === peer.id ? post.anonymousName : peer.nickname;
}

export async function markSessionRead<T extends Pick<SessionReadState, "id" | "userAId" | "lastReadAtA" | "lastReadAtB">>(
  session: T,
  currentUserId: number
) {
  const readAt = new Date();
  if (session.userAId === currentUserId) {
    await prisma.tempSession.update({ where: { id: session.id }, data: { lastReadAtA: readAt } });
    return { ...session, lastReadAtA: readAt };
  }
  await prisma.tempSession.update({ where: { id: session.id }, data: { lastReadAtB: readAt } });
  return { ...session, lastReadAtB: readAt };
}

export async function markApplicationRead<T extends ApplicationReadState>(application: T, currentUserId: number) {
  const readAt = new Date();
  if (application.post.publisherId === currentUserId) {
    await prisma.matchApplication.update({ where: { id: application.id }, data: { viewedByPublisherAt: readAt } });
    return { ...application, viewedByPublisherAt: readAt };
  }
  await prisma.matchApplication.update({ where: { id: application.id }, data: { viewedByApplicantAt: readAt } });
  return { ...application, viewedByApplicantAt: readAt };
}

export function ownSessionActivity(session: { userAId: number }, currentUserId: number, readAt = new Date()) {
  return session.userAId === currentUserId
    ? { updatedAt: readAt, lastReadAtA: readAt, lastActivityById: currentUserId }
    : { updatedAt: readAt, lastReadAtB: readAt, lastActivityById: currentUserId };
}
