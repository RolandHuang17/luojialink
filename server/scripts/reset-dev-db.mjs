import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(root, "prisma", "schema.prisma");
const defaultDbPath = resolve(root, "prisma", "dev.db");

function resolveDatabasePath() {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  if (!url.startsWith("file:")) {
    throw new Error("reset-dev-db only supports SQLite file: DATABASE_URL values");
  }
  const rawPath = url.slice("file:".length);
  if (!rawPath || rawPath === "./dev.db") return defaultDbPath;
  return resolve(root, rawPath);
}

function prismaBin() {
  return process.platform === "win32"
    ? resolve(root, "node_modules", ".bin", "prisma.CMD")
    : resolve(root, "node_modules", ".bin", "prisma");
}

function generateSql() {
  const args = ["migrate", "diff", "--from-empty", "--to-schema-datamodel", schemaPath, "--script"];
  return execFileSync(prismaBin(), args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
  });
}

const dbPath = resolveDatabasePath();
mkdirSync(dirname(dbPath), { recursive: true });
if (existsSync(dbPath)) rmSync(dbPath);

const sql = generateSql();

const db = new DatabaseSync(dbPath);
try {
  db.exec("PRAGMA foreign_keys=ON;");
  db.exec(sql);
} finally {
  db.close();
}

console.log(`SQLite database reset from Prisma schema: ${dbPath}`);
