const { request } = require("../../utils/request");
const { saveSession } = require("../../utils/session");

Page({
  data: {
    accounts: [
      { key: "alice", name: "Alice · 常发想搭" },
      { key: "bob", name: "Bob · 常来申请" },
      { key: "carol", name: "Carol · 随便看看" },
      { key: "newbie", name: "新同学 · 走一遍注册" }
    ],
    registering: false
  },
  async login(event) {
    const account = event.currentTarget.dataset.account;
    try {
      const data = await request({
        url: "/auth/mock-login",
        method: "POST",
        data: { account }
      });
      saveSession(data.token, data.user);
      if (data.user.onboardingCompleted) {
        wx.switchTab({ url: "/pages/square/square" });
      } else {
        wx.redirectTo({ url: "/pages/onboarding/onboarding" });
      }
    } catch (error) {
      console.error(error);
    }
  },
  async register() {
    if (this.data.registering) return;
    this.setData({ registering: true });
    try {
      const data = await request({
        url: "/auth/mock-register",
        method: "POST"
      });
      saveSession(data.token, data.user);
      wx.redirectTo({ url: "/pages/onboarding/onboarding" });
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ registering: false });
    }
  }
});
