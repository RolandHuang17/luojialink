const { request } = require("../../utils/request");
const { saveSession } = require("../../utils/session");

Page({
  data: {
    accounts: [
      { key: "alice", name: "知夏 · 爱组局的搭子" },
      { key: "bob", name: "亦辰 · 随和的运动搭子" },
      { key: "carol", name: "一诺 · 安静的学霸搭子" },
      { key: "newbie", name: "新同学 · 首次注册体验" }
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
