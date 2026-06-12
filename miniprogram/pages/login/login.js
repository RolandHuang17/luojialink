const { request } = require("../../utils/request");
const { saveSession } = require("../../utils/session");

Page({
  async login(event) {
    const account = event.currentTarget.dataset.account;
    try {
      const data = await request({
        url: "/auth/mock-login",
        method: "POST",
        data: { account }
      });
      saveSession(data.token, data.user);
      wx.switchTab({ url: "/pages/square/square" });
    } catch (error) {
      console.error(error);
    }
  }
});
