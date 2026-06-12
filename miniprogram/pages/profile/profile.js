const { clearSession, requireLogin } = require("../../utils/session");

Page({
  data: {
    user: null
  },
  onShow() {
    if (!requireLogin()) return;
    this.setData({ user: getApp().globalData.user });
  },
  logout() {
    clearSession();
    wx.reLaunch({ url: "/pages/login/login" });
  }
});
