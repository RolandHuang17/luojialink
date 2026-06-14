import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { findCommonTags } from "../services/matching.js";
import { findUserScheduleConflicts, formatConflictMessage } from "../services/schedule.js";
import { fail, ok } from "../utils/http.js";

export const applicationsRouter = Router();

function parsePositiveId(value: string | string[] | undefined) {
  if (Array.isArray(value) || !value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function serializeApplication(application: any, currentUserId: number) {
  return {
    id: application.id,
    postId: application.postId,
    status: application.status,
    matchScore: application.matchScore,
    applyMessage: application.applyMessage,
    contactExchanged: application.contactExchanged,
    createdAt: application.createdAt,
    post: application.post
      ? {
          id: application.post.id,
          title: application.post.title || application.post.description,
          detail: application.post.detail || application.post.description,
          category: application.post.category,
          activityLocation: application.post.activityLocation || application.post.locationPref,
          description: application.post.detail || application.post.description,
          locationPref: application.post.activityLocation || application.post.locationPref,
          feePref: application.post.feePref,
          startTime: application.post.startTime,
          endTime: application.post.endTime,
          status: application.post.status,
          publisher: application.post.publisher
            ? {
                id: application.post.publisher.id,
                nickname: application.post.publisher.nickname,
                avatarUrl: application.post.publisher.avatarUrl,
                displayName: application.post.anonymousFlag
                  ? application.post.anonymousName
                  : application.post.publisher.nickname,
              }
            : undefined,
        }
      : undefined,
    applicant: application.applicant
      ? {
          id: application.applicant.id,
          nickname: application.applicant.nickname,
          avatarUrl: application.applicant.avatarUrl,
          gender: application.applicant.gender,
          college: application.applicant.college,
          grade: application.applicant.grade,
          anonymousNo: application.applicant.anonymousNo,
          isMine: application.applicant.id === currentUserId,
        }
      : undefined,
  };
}

applicationsRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const applications = await prisma.matchApplication.findMany({
    where: { applicantId: req.user!.id },
    include: {
      post: {
        include: {
          publisher: { select: { id: true, nickname: true, avatarUrl: true, anonymousNo: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(res, { applications: applications.map((item) => serializeApplication(item, req.user!.id)) });
});

applicationsRouter.get("/received", requireAuth, async (req: AuthedRequest, res) => {
  const applications = await prisma.matchApplication.findMany({
    where: { post: { publisherId: req.user!.id } },
    include: {
      applicant: { include: { tags: { include: { tag: true } } } },
      post: {
        include: {
          publisher: { include: { tags: { include: { tag: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(res, {
    applications: applications.map((application) => {
      const publisherTags = application.post.publisher.tags.map((item) => item.tag);
      const applicantTags = application.applicant.tags.map((item) => item.tag);
      return {
        ...serializeApplication(application, req.user!.id),
        commonTags: findCommonTags(publisherTags, applicantTags),
        applicant: {
          id: application.applicant.id,
          nickname: application.applicant.nickname,
          avatarUrl: application.applicant.avatarUrl,
          gender: application.applicant.gender,
          college: application.applicant.college,
          grade: application.applicant.grade,
          anonymousNo: application.applicant.anonymousNo,
          tags: applicantTags,
        },
      };
    }),
  });
});

applicationsRouter.post("/:id/withdraw", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "申请 ID 无效");

  const application = await prisma.matchApplication.findUnique({ where: { id }, include: { post: true } });
  if (!application) return fail(res, 404, 40400, "申请不存在");
  if (application.applicantId !== req.user!.id) return fail(res, 403, 40300, "无权撤回该申请");
  if (application.status !== "pending") return fail(res, 409, 40900, "只有待处理申请可以撤回");

  const withdrawn = await prisma.matchApplication.update({ where: { id }, data: { status: "withdrawn" } });
  return ok(res, { application: withdrawn });
});

applicationsRouter.post("/:id/accept", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "申请 ID 无效");

  const application = await prisma.matchApplication.findUnique({ where: { id }, include: { post: true } });
  if (!application) return fail(res, 404, 40400, "申请不存在");
  if (application.post.publisherId !== req.user!.id) return fail(res, 403, 40300, "无权处理该申请");
  if (application.status !== "pending") return fail(res, 409, 40900, "该申请已处理");
  if (application.post.status !== "published" || application.post.endTime <= new Date()) {
    return fail(res, 409, 40901, "该想搭已不可匹配");
  }

  const publisherConflicts = await findUserScheduleConflicts(
    prisma,
    application.post.publisherId,
    { startTime: application.post.startTime, endTime: application.post.endTime },
    { excludePostId: application.postId }
  );
  if (publisherConflicts.length > 0) {
    return fail(res, 409, 40902, formatConflictMessage(publisherConflicts), { conflicts: publisherConflicts });
  }

  const applicantConflicts = await findUserScheduleConflicts(prisma, application.applicantId, {
    startTime: application.post.startTime,
    endTime: application.post.endTime,
  }, { excludeApplicationId: application.id });
  if (applicantConflicts.length > 0) {
    return fail(res, 409, 40903, formatConflictMessage(applicantConflicts), { conflicts: applicantConflicts });
  }

  const result = await prisma.$transaction(async (tx) => {
    const accepted = await tx.matchApplication.update({ where: { id }, data: { status: "accepted" } });
    await tx.matchApplication.updateMany({
      where: { postId: application.postId, id: { not: id }, status: "pending" },
      data: { status: "rejected" },
    });
    const post = await tx.post.update({ where: { id: application.postId }, data: { status: "matched" } });
    const session = await tx.tempSession.create({
      data: {
        postId: application.postId,
        userAId: application.post.publisherId,
        userBId: application.applicantId,
        expireTime: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });
    return { application: accepted, post, session };
  });

  return ok(res, result);
});

applicationsRouter.post("/:id/reject", requireAuth, async (req: AuthedRequest, res) => {
  const id = parsePositiveId(req.params.id);
  if (!id) return fail(res, 400, 40001, "申请 ID 无效");

  const application = await prisma.matchApplication.findUnique({ where: { id }, include: { post: true } });
  if (!application) return fail(res, 404, 40400, "申请不存在");
  if (application.post.publisherId !== req.user!.id) return fail(res, 403, 40300, "无权处理该申请");
  if (application.status !== "pending") return fail(res, 409, 40900, "该申请已处理");

  const rejected = await prisma.matchApplication.update({ where: { id }, data: { status: "rejected" } });
  return ok(res, { application: rejected });
});
