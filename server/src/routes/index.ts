import { Router } from "express";
import { adminRouter } from "./admin.js";
import { applicationsRouter } from "./applications.js";
import { authRouter } from "./auth.js";
import { calendarRouter } from "./calendar.js";
import { healthRouter } from "./health.js";
import { poisRouter } from "./pois.js";
import { postsRouter } from "./posts.js";
import { recommendationsRouter } from "./recommendations.js";
import { reportsRouter } from "./reports.js";
import { sessionsRouter } from "./sessions.js";
import { tagsRouter } from "./tags.js";
import { usersRouter } from "./users.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/tags", tagsRouter);
apiRouter.use("/posts", postsRouter);
apiRouter.use("/applications", applicationsRouter);
apiRouter.use("/sessions", sessionsRouter);
apiRouter.use("/calendar", calendarRouter);
apiRouter.use("/pois", poisRouter);
apiRouter.use("/recommendations", recommendationsRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/admin", adminRouter);
