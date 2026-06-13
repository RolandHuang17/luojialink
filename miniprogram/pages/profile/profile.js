const { clearSession, requireLogin } = require("../../utils/session");

Page({
  data: {
    user: null
  },
  onShow() {
    if (!requireLogin()) return;
    this.setData({ user: getApp().globalData.user });
  },
  goApplications() {
    wx.navigateTo({ url: "/pages/applications/applications" });
  },
  logout() {
    clearSession();
    wx.reLaunch({ url: "/pages/login/login" });
  }
});
