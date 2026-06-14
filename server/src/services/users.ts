import type { User } from "@prisma/client";
import { prisma } from "../db.js";
import { parseJsonArray } from "../domain/options.js";

export function publicUserSelect() {
  return {
    id: true,
    nickname: true,
    avatarUrl: true,
    gender: true,
    college: true,
    grade: true,
    campus: true,
    mbti: true,
    relationExpectation: true,
    bio: true,
    hobbies: true,
    favoriteThings: true,
    messageToPeer: true,
    dealBreakers: true,
    personalTraits: true,
    anonymousNo: true,
  } as const;
}

export function serializeUser(user: User, options: { includePrivate?: boolean; contactVisible?: boolean } = {}) {
  return {
    id: user.id,
    mockOpenId: user.mockOpenId,
    studentNo: options.includePrivate ? user.studentNo : undefined,
    realName: options.includePrivate ? user.realName : undefined,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    college: user.college,
    grade: user.grade,
    age: user.age,
    gender: user.gender,
    hometown: user.hometown,
    campus: user.campus,
    mbti: user.mbti,
    relationExpectation: user.relationExpectation,
    bio: user.bio,
    hobbies: user.hobbies,
    favoriteThings: user.favoriteThings,
    messageToPeer: user.messageToPeer,
    dealBreakers: user.dealBreakers,
    personalTraits: parseJsonArray(user.personalTraits),
    anonymousNo: user.anonymousNo,
    onboardingCompleted: user.onboardingCompleted,
    wechatId: options.includePrivate || options.contactVisible ? user.wechatId : undefined,
    wechatVisible: Boolean(options.includePrivate || options.contactVisible),
  };
}

export async function getProfile(userId: number) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { tags: { include: { tag: true } } },
  });

  return {
    ...serializeUser(user, { includePrivate: true }),
    tags: user.tags.map((item) => item.tag),
  };
}
