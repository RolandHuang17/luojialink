export const COLLEGES = [
  "计算机学院",
  "信息管理学院",
  "外国语言文学学院",
  "经济与管理学院",
  "新闻与传播学院",
  "电子信息学院",
  "医学部",
  "法学院",
] as const;

export const GRADES = ["2022", "2023", "2024", "2025", "2026"] as const;
export const AGES = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26] as const;
export const GENDERS = ["男", "女", "其他", "保密"] as const;
export const HOMETOWNS = ["北京", "上海", "湖北", "湖南", "广东", "浙江", "江苏", "四川", "河南", "山东", "福建", "重庆"] as const;
export const CAMPUSES = ["信息学部", "文理学部", "工学部", "医学部"] as const;
export const RELATION_EXPECTATIONS = ["搭子", "朋友"] as const;
export const PERSONAL_TRAITS = ["探索欲", "自律", "坦诚", "善良", "幽默", "谦逊", "专一", "责任感", "正直", "聪明"] as const;
export const POST_CATEGORIES = ["吃饭", "运动", "自习", "娱乐"] as const;
export const POST_STATUSES = ["draft", "published", "matched", "cancelled", "expired"] as const;
export const APPLICATION_STATUSES = ["pending", "accepted", "rejected", "withdrawn"] as const;
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
