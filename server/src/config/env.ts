import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3000),
  authMode: process.env.AUTH_MODE ?? "mock",
  aiMode: process.env.AI_MODE ?? "template",
  poiMode: process.env.POI_MODE ?? "mock",
  postMaxActive: Number(process.env.POST_MAX_ACTIVE ?? 5),
  sessionExpireHours: Number(process.env.SESSION_EXPIRE_HOURS ?? 72),
  logLevel: process.env.LOG_LEVEL ?? "debug",
};
