import { Router } from "express";
import multer from "multer";
import path from "path";
import { AVATAR_DIR, ensureUploadDirs } from "../utils/uploads.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { fail, ok } from "../utils/http.js";

export const uploadsRouter = Router();

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadDirs();
      cb(null, AVATAR_DIR);
    },
    filename: (req, file, cb) => {
      const authedReq = req as AuthedRequest;
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = allowedExtensions.has(ext) ? ext : ".jpg";
      cb(null, `user-${authedReq.user!.id}-${Date.now()}${safeExt}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("只支持图片文件"));
  },
});

uploadsRouter.post("/avatar", requireAuth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "图片太大了，请换一张"
          : err.message || "头像上传失败";
      return fail(res, 400, 40001, message);
    }

    const file = req.file;
    if (!file) {
      return fail(res, 400, 40001, "请选择一张图片");
    }

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return ok(res, { url: `${baseUrl}/uploads/avatars/${file.filename}` });
  });
});
