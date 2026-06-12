import cors from "cors";
import express from "express";
import morgan from "morgan";
import { apiRouter } from "./routes/index.js";
import { fail } from "./utils/http.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  app.use("/api", apiRouter);

  app.use((_req, res) => fail(res, 404, 40400, "接口不存在"));

  return app;
}
