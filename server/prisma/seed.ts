import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  {
    mockOpenId: "mock_alice",
    studentNo: "20230001",
    realName: "林知夏",
    nickname: "知夏",
    college: "计算机学院",
    grade: "2023",
    anonymousNo: "珞珈狐 01",
    tags: ["约饭", "轻食", "自习", "预算友好"],
  },
  {
    mockOpenId: "mock_bob",
    studentNo: "20220002",
    realName: "周亦辰",
    nickname: "亦辰",
    college: "信息管理学院",
    grade: "2022",
    anonymousNo: "樱花树 03",
    tags: ["约饭", "羽毛球", "火锅", "随和"],
  },
  {
    mockOpenId: "mock_carol",
    studentNo: "20240003",
    realName: "陈一诺",
    nickname: "一诺",
    college: "外国语学院",
    grade: "2024",
    anonymousNo: "桂花鹿 07",
    tags: ["自习", "观影", "安静", "剧院"],
  },
];

const tags = [
  ["约饭", "activity"],
  ["运动", "activity"],
  ["自习", "activity"],
  ["观影", "activity"],
  ["剧院", "activity"],
  ["轻食", "interest"],
  ["火锅", "interest"],
  ["羽毛球", "interest"],
  ["考研", "interest"],
  ["安静", "style"],
  ["随和", "style"],
  ["预算友好", "cost"],
];

async function main() {
  await prisma.report.deleteMany();
  await prisma.aIRecommendation.deleteMany();
  await prisma.message.deleteMany();
  await prisma.tempSession.deleteMany();
  await prisma.calendarSlot.deleteMany();
  await prisma.matchApplication.deleteMany();
  await prisma.post.deleteMany();
  await prisma.userTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.poi.deleteMany();
  await prisma.user.deleteMany();

  for (const [name, type] of tags) {
    await prisma.tag.create({ data: { name, type } });
  }

  for (const item of users) {
    const user = await prisma.user.create({
      data: {
        mockOpenId: item.mockOpenId,
        studentNo: item.studentNo,
        realName: item.realName,
        nickname: item.nickname,
        college: item.college,
        grade: item.grade,
        anonymousNo: item.anonymousNo,
      },
    });

    const userTags = await prisma.tag.findMany({ where: { name: { in: item.tags } } });
    for (const tag of userTags) {
      await prisma.userTag.create({ data: { userId: user.id, tagId: tag.id, weight: 1 } });
    }
  }

  const alice = await prisma.user.findUniqueOrThrow({ where: { mockOpenId: "mock_alice" } });
  const bob = await prisma.user.findUniqueOrThrow({ where: { mockOpenId: "mock_bob" } });
  const carol = await prisma.user.findUniqueOrThrow({ where: { mockOpenId: "mock_carol" } });

  const now = new Date();
  const tonightStart = new Date(now);
  tonightStart.setHours(18, 30, 0, 0);
  const tonightEnd = new Date(now);
  tonightEnd.setHours(20, 0, 0, 0);
  const expire = new Date(now);
  expire.setHours(18, 0, 0, 0);
  if (expire <= now) expire.setDate(expire.getDate() + 1);
  if (tonightStart <= now) {
    tonightStart.setDate(tonightStart.getDate() + 1);
    tonightEnd.setDate(tonightEnd.getDate() + 1);
  }

  await prisma.post.createMany({
    data: [
      {
        publisherId: alice.id,
        category: "约饭",
        startTime: tonightStart,
        endTime: tonightEnd,
        locationPref: "工学部附近",
        feePref: "AA，预算 30-50",
        description: "想找一位同学一起吃晚饭，可以边吃边聊课程项目。",
        anonymousName: alice.anonymousNo,
        expireTime: expire,
      },
      {
        publisherId: bob.id,
        category: "运动",
        startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 26 * 60 * 60 * 1000),
        locationPref: "卓尔体育馆",
        feePref: "AA",
        description: "明天下午羽毛球，水平不限，轻松打一场。",
        anonymousName: bob.anonymousNo,
        expireTime: new Date(now.getTime() + 20 * 60 * 60 * 1000),
      },
      {
        publisherId: carol.id,
        category: "自习",
        startTime: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 52 * 60 * 60 * 1000),
        locationPref: "总图书馆",
        feePref: "无",
        description: "周末想找同学一起安静自习，互相监督。",
        anonymousName: carol.anonymousNo,
        expireTime: new Date(now.getTime() + 36 * 60 * 60 * 1000),
      },
    ],
  });

  await prisma.calendarSlot.createMany({
    data: [
      { userId: alice.id, date: tonightStart.toISOString().slice(0, 10), startTime: "18:00", endTime: "20:30" },
      { userId: bob.id, date: tonightStart.toISOString().slice(0, 10), startTime: "19:00", endTime: "21:00" },
      { userId: carol.id, date: tonightStart.toISOString().slice(0, 10), startTime: "17:00", endTime: "19:30" },
    ],
  });

  await prisma.poi.createMany({
    data: [
      { name: "桂园食堂", category: "约饭", location: "桂园附近", rating: 4.4, tags: "预算友好,校内" },
      { name: "工学部一食堂", category: "约饭", location: "工学部", rating: 4.3, tags: "校内,快餐" },
      { name: "珞珈咖啡", category: "自习", location: "总图附近", rating: 4.5, tags: "安静,咖啡" },
      { name: "卓尔体育馆", category: "运动", location: "文理学部", rating: 4.6, tags: "羽毛球,运动" },
      { name: "总图书馆", category: "自习", location: "文理学部", rating: 4.8, tags: "安静,自习" },
      { name: "街道口影院", category: "观影", location: "街道口", rating: 4.2, tags: "校外,电影" },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
