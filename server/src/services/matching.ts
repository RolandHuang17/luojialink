import type { Tag } from "@prisma/client";

export function computeSimpleMatchScore(a: Tag[], b: Tag[]) {
  const bNames = new Set(b.map((tag) => tag.name));
  const commonCount = a.filter((tag) => bNames.has(tag.name)).length;
  return Math.min(95, 60 + commonCount * 10);
}

export function findCommonTags(a: Tag[], b: Tag[]) {
  const bNames = new Set(b.map((tag) => tag.name));
  return a.filter((tag) => bNames.has(tag.name));
}
