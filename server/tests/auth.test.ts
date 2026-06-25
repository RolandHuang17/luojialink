import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

const app = createApp();
const userIds: number[] = [];

afterEach(async () => {
  if (userIds.length === 0) return;
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  userIds.length = 0;
});

describe("mock auth", () => {
  it("creates a fresh demo account via mock-register", async () => {
    const res = await request(app).post("/api/auth/mock-register").send({});
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toMatch(/^mock-token-\d+$/);
    expect(res.body.data.user.onboardingCompleted).toBe(false);
    expect(res.body.data.user.nickname).toMatch(/^测试同学/);

    userIds.push(res.body.data.user.id);

    const second = await request(app).post("/api/auth/mock-register").send({});
    expect(second.status).toBe(200);
    expect(second.body.data.user.id).not.toBe(res.body.data.user.id);
    userIds.push(second.body.data.user.id);
  });

  it("supports the product login and register entry points", async () => {
    const login = await request(app).post("/api/auth/wechat-login").send({ phoneNumber: "18800001111" });
    expect(login.status).toBe(200);
    expect(login.body.code).toBe(0);
    expect(login.body.data.token).toMatch(/^mock-token-\d+$/);
    expect(login.body.data.user.wechatId).toBe("18800001111");
    userIds.push(login.body.data.user.id);

    const samePhone = await request(app).post("/api/auth/wechat-login").send({ phoneNumber: "18800001111" });
    expect(samePhone.status).toBe(200);
    expect(samePhone.body.data.user.id).toBe(login.body.data.user.id);

    const register = await request(app).post("/api/auth/wechat-register").send({});
    expect(register.status).toBe(200);
    expect(register.body.code).toBe(0);
    expect(register.body.data.user.onboardingCompleted).toBe(false);
    expect(register.body.data.user.nickname).toMatch(/^珞珈同学/);
    userIds.push(register.body.data.user.id);
  });
});
