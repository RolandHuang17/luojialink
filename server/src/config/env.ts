import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3000),
  authMode: process.env.AUTH_MODE ?? "mock",
  aiMode: process.env.AI_MODE ?? "template",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  poiMode: process.env.POI_MODE ?? "mock",
  postMaxActive: Number(process.env.POST_MAX_ACTIVE ?? 5),
  sessionExpireHours: Number(process.env.SESSION_EXPIRE_HOURS ?? 72),
  logLevel: process.env.LOG_LEVEL ?? "debug",
};
