const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

Page({
  data: {
    user: null,
    userId: null
  },
  onLoad(query) {
    if (!requireLogin()) return;
    const userId = Number(query.id || getApp().globalData.user.id);
    this.setData({ userId });
    this.loadUser(userId);
  },
  onShow() {
    if (!requireLogin() || !this.data.userId) return;
    this.loadUser(this.data.userId);
  },
  async loadUser(id) {
    const data = await request({ url: `/users/${id}/homepage` });
    this.setData({ user: { ...data.user, isMine: data.user.id === getApp().globalData.user.id } });
  },
  onTapMbti() {
    const user = this.data.user;
    if (!user || !user.isMine) return;
    wx.navigateTo({ url: `/pages/profile-mbti/profile-mbti?mbti=${user.mbti || "ENFP"}` });
  },
  reportUser() {
    if (!this.data.user) return;
    wx.navigateTo({ url: `/pages/report/report?targetType=user&targetId=${this.data.user.id}` });
  }
});
