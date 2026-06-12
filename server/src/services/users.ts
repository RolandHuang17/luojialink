import { prisma } from "../db.js";

export function publicUserSelect() {
  return {
    id: true,
    nickname: true,
    college: true,
    grade: true,
    anonymousNo: true,
  } as const;
}

export async function getProfile(userId: number) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { tags: { include: { tag: true } } },
  });

  return {
    id: user.id,
    mockOpenId: user.mockOpenId,
    studentNo: user.studentNo,
    realName: user.realName,
    nickname: user.nickname,
    college: user.college,
    grade: user.grade,
    anonymousNo: user.anonymousNo,
    tags: user.tags.map((item) => item.tag),
  };
}
