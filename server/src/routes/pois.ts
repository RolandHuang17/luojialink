import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { fail, ok } from "../utils/http.js";

export const poisRouter = Router();

const poiQuerySchema = z.object({
  category: z.string().trim().max(32).optional(),
  keyword: z.string().trim().max(64).optional(),
});

function splitTags(tags: string) {
  return tags
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function includesText(source: string | null | undefined, target: string) {
  return (source ?? "").toLowerCase().includes(target.toLowerCase());
}

poisRouter.get("/", requireAuth, async (req, res) => {
  const parsed = poiQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return fail(res, 400, 40001, "地点查询参数错误", parsed.error.flatten());
  }

  const category = parsed.data.category;
  const keyword = parsed.data.keyword;
  const pois = await prisma.poi.findMany();
  const ranked = pois
    .map((poi) => {
      const categoryMatched = !category || includesText(poi.category, category) || includesText(poi.tags, category);
      const keywordMatched =
        !keyword ||
        includesText(poi.name, keyword) ||
        includesText(poi.location, keyword) ||
        includesText(poi.category, keyword) ||
        includesText(poi.tags, keyword);
      if (!categoryMatched || !keywordMatched) return null;

      let relevanceScore = poi.rating ?? 0;
      if (category && poi.category === category) relevanceScore += 20;
      if (category && includesText(poi.tags, category)) relevanceScore += 8;
      if (keyword && includesText(poi.name, keyword)) relevanceScore += 12;
      if (keyword && includesText(poi.location, keyword)) relevanceScore += 8;
      if (keyword && includesText(poi.tags, keyword)) relevanceScore += 5;

      return { poi, relevanceScore };
    })
    .filter((item): item is { poi: (typeof pois)[number]; relevanceScore: number } => Boolean(item))
    .sort((a, b) => b.relevanceScore - a.relevanceScore || (b.poi.rating ?? 0) - (a.poi.rating ?? 0))
    .slice(0, 20);

  return ok(res, {
    pois: ranked.map(({ poi, relevanceScore }) => ({
      id: poi.id,
      name: poi.name,
      category: poi.category,
      location: poi.location,
      rating: poi.rating,
      tags: splitTags(poi.tags),
      relevanceScore: Number(relevanceScore.toFixed(1)),
    })),
  });
});
