import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  {
    mockOpenId: "mock_alice",
    studentNo: "20230001",
    realName: "林知夏",
    nickname: "知夏",
    avatarUrl: "https://dummyimage.com/160x160/1d6f5f/ffffff&text=A",
    college: "计算机学院",
    grade: "2023",
    age: 21,
    gender: "女",
    hometown: "湖北",
    wechatId: "alice_whu",
    campus: "信息学部",
    mbti: "ENFJ",
    relationExpectation: "搭子",
    bio: "喜欢把计划做清楚，也喜欢临时发现好吃的小店。",
    hobbies: "羽毛球、轻食、课程项目",
    favoriteThings: "桂园的风、晚饭后的散步、把 bug 修掉的瞬间",
    messageToPeer: "希望我们都能轻松一点，不尬聊也不冷场。",
    dealBreakers: "临时爽约、言语冒犯、不尊重边界",
    personalTraits: ["自律", "坦诚", "责任感"],
    anonymousNo: "珞珈鹿 01",
    tags: ["吃饭", "轻食", "自习", "预算友好"],
  },
  {
    mockOpenId: "mock_bob",
    studentNo: "20220002",
    realName: "周亦辰",
    nickname: "亦辰",
    avatarUrl: "https://dummyimage.com/160x160/2d7ff9/ffffff&text=B",
    college: "信息管理学院",
    grade: "2022",
    age: 22,
    gender: "男",
    hometown: "广东",
    wechatId: "bob_whu",
    campus: "文理学部",
    mbti: "INFP",
    relationExpectation: "朋友",
    bio: "慢热但靠谱，喜欢运动和安静自习。",
    hobbies: "羽毛球、火锅、电影",
    favoriteThings: "一场好球、热气腾腾的火锅、湖边晚风",
    messageToPeer: "可以先从一个小计划开始，合拍就继续约。",
    dealBreakers: "迟到太久、强行推销、攻击性表达",
    personalTraits: ["善良", "幽默", "谦逊"],
    anonymousNo: "樱花鲸 03",
    tags: ["吃饭", "羽毛球", "火锅", "随和"],
  },
  {
    mockOpenId: "mock_carol",
    studentNo: "20240003",
    realName: "陈一诺",
    nickname: "一诺",
    avatarUrl: "https://dummyimage.com/160x160/f08a5d/ffffff&text=C",
    college: "外国语言文学学院",
    grade: "2024",
    age: 20,
    gender: "女",
    hometown: "浙江",
    wechatId: "carol_whu",
    campus: "工学部",
    mbti: "ISTJ",
    relationExpectation: "搭子",
    bio: "喜欢稳定节奏，想找能互相督促的同学。",
    hobbies: "自习、观影、剧院",
    favoriteThings: "安静座位、手账、周末电影",
    messageToPeer: "如果你也想认真完成计划，我们会很合拍。",
    dealBreakers: "放鸽子、过度打探隐私、打扰学习",
    personalTraits: ["专一", "正直", "聪明"],
    anonymousNo: "桂花鹤 07",
    tags: ["自习", "观影", "安静", "剧院"],
  },
  {
    mockOpenId: "mock_newbie",
    studentNo: "20250004",
    realName: "新同学",
    nickname: "新同学",
    avatarUrl: "https://dummyimage.com/160x160/8b9eb7/ffffff&text=N",
    college: "经济与管理学院",
    grade: "2025",
    age: 19,
    gender: "保密",
    hometown: "湖南",
    wechatId: "newbie_whu",
    campus: "文理学部",
    mbti: "ENFP",
    relationExpectation: "搭子",
    bio: "还没完成注册，用来演示 onboarding。",
    hobbies: "待填写",
    favoriteThings: "待填写",
    messageToPeer: "待填写",
    dealBreakers: "待填写",
    personalTraits: ["探索欲", "善良", "幽默"],
    anonymousNo: "新生松 09",
    onboardingCompleted: false,
    tags: ["吃饭", "随和"],
  },
];

const tags = [
  ["吃饭", "activity"],
  ["运动", "activity"],
  ["自习", "activity"],
  ["娱乐", "activity"],
  ["轻食", "interest"],
  ["火锅", "interest"],
  ["羽毛球", "interest"],
  ["考研", "interest"],
  ["安静", "style"],
  ["随和", "style"],
  ["预算友好", "cost"],
  ["剧院", "interest"],
  ["观影", "interest"],
];

function addHours(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

function dateText(value: Date) {
  return value.toISOString().slice(0, 10);
}

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
        avatarUrl: item.avatarUrl,
        college: item.college,
        grade: item.grade,
        age: item.age,
        gender: item.gender,
        hometown: item.hometown,
        wechatId: item.wechatId,
        campus: item.campus,
        mbti: item.mbti,
        relationExpectation: item.relationExpectation,
        bio: item.bio,
        hobbies: item.hobbies,
        favoriteThings: item.favoriteThings,
        messageToPeer: item.messageToPeer,
        dealBreakers: item.dealBreakers,
        personalTraits: JSON.stringify(item.personalTraits),
        onboardingCompleted: item.onboardingCompleted ?? true,
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
  const dinnerStart = addHours(now, 5);
  const dinnerEnd = addHours(now, 6.5);
  const sportStart = addHours(now, 26);
  const sportEnd = addHours(now, 28);
  const studyStart = addHours(now, 50);
  const studyEnd = addHours(now, 53);
  const movieStart = addHours(now, 72);
  const movieEnd = addHours(now, 75);

  const dinner = await prisma.post.create({
    data: {
      publisherId: alice.id,
      title: "今晚一起吃顿轻松的晚饭",
      detail: "想找一位同学在工学部附近吃晚饭，可以边吃边聊课程项目，预算 30-50。",
      category: "吃饭",
      startTime: dinnerStart,
      endTime: dinnerEnd,
      activityLocation: "工学部一食堂",
      locationPref: "工学部一食堂",
      feePref: "AA，预算 30-50",
      description: "想找一位同学在工学部附近吃晚饭，可以边吃边聊课程项目。",
      anonymousName: alice.anonymousNo,
      expireTime: addHours(now, 4),
      status: "published",
    },
  });

  const sport = await prisma.post.create({
    data: {
      publisherId: bob.id,
      title: "明天下午羽毛球双打缺一位",
      detail: "卓尔体育馆轻松打一场，水平不限，主要是活动一下。",
      category: "运动",
      startTime: sportStart,
      endTime: sportEnd,
      activityLocation: "卓尔体育馆",
      locationPref: "卓尔体育馆",
      feePref: "AA",
      description: "羽毛球轻松打一场，水平不限。",
      anonymousName: bob.anonymousNo,
      expireTime: addHours(now, 24),
      status: "published",
    },
  });

  const study = await prisma.post.create({
    data: {
      publisherId: carol.id,
      title: "周末总图安静自习",
      detail: "想找同学一起在总图自习三小时，互相监督，中间可以短休。",
      category: "自习",
      startTime: studyStart,
      endTime: studyEnd,
      activityLocation: "总图书馆",
      locationPref: "总图书馆",
      feePref: "无",
      description: "一起安静自习，互相监督。",
      anonymousName: carol.anonymousNo,
      expireTime: addHours(now, 48),
      status: "published",
    },
  });

  const movie = await prisma.post.create({
    data: {
      publisherId: alice.id,
      title: "周末看电影后散步",
      detail: "想去街道口看电影，结束后可以沿校园散步聊聊最近看的书。",
      category: "娱乐",
      startTime: movieStart,
      endTime: movieEnd,
      activityLocation: "街道口影院",
      locationPref: "街道口影院",
      feePref: "各自购票",
      description: "周末看电影，结束后散步。",
      anonymousName: alice.anonymousNo,
      expireTime: addHours(now, 70),
      status: "draft",
    },
  });

  const bobApplication = await prisma.matchApplication.create({
    data: {
      postId: dinner.id,
      applicantId: bob.id,
      applyMessage: "我也在工学部附近，想一起吃个简单晚饭。",
      matchScore: 70,
      status: "pending",
    },
  });

  await prisma.matchApplication.create({
    data: {
      postId: study.id,
      applicantId: alice.id,
      applyMessage: "想找人一起安静自习，我可以准时到。",
      matchScore: 80,
      status: "rejected",
    },
  });

  const accepted = await prisma.matchApplication.create({
    data: {
      postId: sport.id,
      applicantId: alice.id,
      applyMessage: "我会一点羽毛球，想一起活动一下。",
      matchScore: 75,
      status: "accepted",
      contactExchanged: true,
    },
  });

  await prisma.post.update({ where: { id: sport.id }, data: { status: "matched" } });
  const session = await prisma.tempSession.create({
    data: {
      postId: sport.id,
      userAId: bob.id,
      userBId: alice.id,
      contactSharedByA: true,
      contactSharedByB: true,
      expireTime: addHours(now, 96),
    },
  });
  await prisma.message.createMany({
    data: [
      { sessionId: session.id, senderId: bob.id, content: "明天下午 3 点卓尔门口见？" },
      { sessionId: session.id, senderId: alice.id, content: "可以，我带球拍，球你那边有吗？" },
    ],
  });
  await prisma.matchApplication.update({ where: { id: accepted.id }, data: { contactExchanged: true } });

  await prisma.calendarSlot.createMany({
    data: [
      { userId: alice.id, date: dateText(dinnerStart), startTime: "18:00", endTime: "20:30", status: "available" },
      { userId: bob.id, date: dateText(dinnerStart), startTime: "18:30", endTime: "21:00", status: "available" },
      { userId: carol.id, date: dateText(dinnerStart), startTime: "17:00", endTime: "19:30", status: "available" },
      { userId: bob.id, date: dateText(studyStart), startTime: "09:00", endTime: "11:00", status: "busy" },
    ],
  });

  await prisma.poi.createMany({
    data: [
      { name: "桂园食堂", category: "吃饭", location: "桂园附近", rating: 4.4, tags: "预算友好,校内" },
      { name: "工学部一食堂", category: "吃饭", location: "工学部", rating: 4.3, tags: "校内,快餐" },
      { name: "珞珈咖啡", category: "自习", location: "总图附近", rating: 4.5, tags: "安静,咖啡" },
      { name: "卓尔体育馆", category: "运动", location: "文理学部", rating: 4.6, tags: "羽毛球,运动" },
      { name: "总图书馆", category: "自习", location: "文理学部", rating: 4.8, tags: "安静,自习" },
      { name: "街道口影院", category: "娱乐", location: "街道口", rating: 4.2, tags: "校外,电影" },
    ],
  });

  console.log(`Seed complete. Pending application: ${bobApplication.id}, matched session: ${session.id}, draft: ${movie.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
