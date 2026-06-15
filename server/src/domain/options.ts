export const COLLEGES = [
  "哲学学院",
  "国学院",
  "文学院",
  "外国语言文学学院",
  "新闻与传播学院",
  "历史学院",
  "艺术学院",
  "经济与管理学院",
  "法学院",
  "马克思主义学院",
  "社会学院",
  "政治与公共管理学院",
  "信息管理学院",
  "数学与统计学院",
  "物理科学与技术学院",
  "化学与分子科学学院",
  "生命科学学院",
  "资源与环境科学学院",
  "水利水电学院",
  "电气与自动化学院",
  "动力与机械学院",
  "城市设计学院",
  "土木建筑工程学院",
  "计算机学院",
  "电子信息学院",
  "遥感信息工程学院",
  "测绘学院",
  "印刷与包装系",
  "网络安全学院",
  "基础医学院",
  "公共卫生学院",
  "药学院",
  "护理学院",
  "口腔医学院",
  "第一临床学院",
  "第二临床学院",
  "医学研究院",
  "弘毅学堂",
  "其他培养单位",
] as const;

export const GRADES = ["大一", "大二", "大三", "大四", "大五", "研一", "研二", "研三", "博一", "博二", "博三", "博四"] as const;
export const AGES = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30] as const;
export const GENDERS = ["男", "女", "其他", "保密"] as const;
export const HOMETOWNS = [
  "北京",
  "天津",
  "河北",
  "山西",
  "内蒙古",
  "辽宁",
  "吉林",
  "黑龙江",
  "上海",
  "江苏",
  "浙江",
  "安徽",
  "福建",
  "江西",
  "山东",
  "河南",
  "湖北",
  "湖南",
  "广东",
  "广西",
  "海南",
  "重庆",
  "四川",
  "贵州",
  "云南",
  "西藏",
  "陕西",
  "甘肃",
  "青海",
  "宁夏",
  "新疆",
  "香港",
  "澳门",
  "台湾",
  "海外",
] as const;
export const CAMPUSES = ["信息学部", "文理学部", "工学部", "医学部"] as const;
export const RELATION_EXPECTATIONS = ["搭子", "朋友"] as const;
export const PERSONAL_TRAITS = ["探索欲", "自律", "坦诚", "善良", "幽默", "谦逊", "专一", "责任感", "正直", "聪明"] as const;
export const POST_CATEGORIES = ["吃饭", "运动", "自习", "娱乐"] as const;
export const POST_STATUSES = ["draft", "published", "matched", "cancelled", "expired"] as const;
export const APPLICATION_STATUSES = ["pending", "accepted", "rejected", "withdrawn", "cancelled"] as const;
export const SESSION_STATUSES = ["active", "closed"] as const;

export const DEFAULT_AVATAR_URL = "/assets/default-avatar.png";

export function isValidMbti(value: string) {
  return /^[EI][SN][TF][JP]$/.test(value);
}

export function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
