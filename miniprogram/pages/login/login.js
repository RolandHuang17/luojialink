const { request } = require("../../utils/request");
const { saveSession } = require("../../utils/session");

Page({
  data: {
    accounts: [
      { key: "alice", name: "Alice / 发布者" },
      { key: "bob", name: "Bob / 申请者" },
      { key: "carol", name: "Carol / 观察者" },
      { key: "newbie", name: "新同学 / 首次注册" }
    ]
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
  }
});
