const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

Page({
  data: {
    user: null
  },
  onLoad(query) {
    if (!requireLogin()) return;
    this.loadUser(Number(query.id || getApp().globalData.user.id));
  },
  async loadUser(id) {
    const data = await request({ url: `/users/${id}/homepage` });
    this.setData({ user: { ...data.user, isMine: data.user.id === getApp().globalData.user.id } });
  },
  reportUser() {
    if (!this.data.user) return;
    wx.navigateTo({ url: `/pages/report/report?targetType=user&targetId=${this.data.user.id}` });
  }
});
