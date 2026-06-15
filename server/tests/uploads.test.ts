import fs from "fs";
import path from "path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { AVATAR_DIR } from "../src/utils/uploads.js";

const app = createApp();
const userIds: number[] = [];
const uploadedFiles: string[] = [];

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

afterEach(async () => {
  for (const filename of uploadedFiles.splice(0)) {
    const filePath = path.join(AVATAR_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    userIds.length = 0;
  }
});

describe("avatar upload", () => {
  it("accepts an image and returns a public url", async () => {
    const user = await prisma.user.create({
      data: {
        mockOpenId: `upload_${Date.now()}`,
        studentNo: `upload_${Date.now()}`,
        realName: "上传测试",
        nickname: "上传测试",
        college: "计算机学院",
        grade: "大一",
        anonymousNo: "上传 01",
      },
    });
    userIds.push(user.id);

    const res = await request(app)
      .post("/api/uploads/avatar")
      .set("Authorization", `Bearer mock-token-${user.id}`)
      .attach("file", PNG, "avatar.png");

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.url).toMatch(/\/uploads\/avatars\/user-\d+-\d+\.png$/);

    const filename = path.basename(res.body.data.url);
    uploadedFiles.push(filename);
    expect(fs.existsSync(path.join(AVATAR_DIR, filename))).toBe(true);

    const staticRes = await request(app).get(`/uploads/avatars/${filename}`);
    expect(staticRes.status).toBe(200);
  });

  it("rejects non-image uploads", async () => {
    const user = await prisma.user.create({
      data: {
        mockOpenId: `upload_txt_${Date.now()}`,
        studentNo: `upload_txt_${Date.now()}`,
        realName: "上传测试",
        nickname: "上传测试",
        college: "计算机学院",
        grade: "大一",
        anonymousNo: "上传 02",
      },
    });
    userIds.push(user.id);

    const res = await request(app)
      .post("/api/uploads/avatar")
      .set("Authorization", `Bearer mock-token-${user.id}`)
      .attach("file", Buffer.from("not-an-image"), "avatar.txt");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/图片/);
  });
});
