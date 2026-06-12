import { Router } from "express";
import { adminRouter } from "./admin.js";
import { authRouter } from "./auth.js";
import { healthRouter } from "./health.js";
import { postsRouter } from "./posts.js";
import { reportsRouter } from "./reports.js";
import { tagsRouter } from "./tags.js";
import { usersRouter } from "./users.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/tags", tagsRouter);
apiRouter.use("/posts", postsRouter);
apiRouter.use("/reports", reportsRouter);
apiRouter.use("/admin", adminRouter);
