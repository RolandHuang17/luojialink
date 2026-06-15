import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.resolve(moduleDir, "../../uploads");
export const AVATAR_DIR = path.join(UPLOADS_DIR, "avatars");
export const COVER_DIR = path.join(UPLOADS_DIR, "covers");

export function ensureUploadDirs() {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
  fs.mkdirSync(COVER_DIR, { recursive: true });
}
