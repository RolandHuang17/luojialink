const { request } = require("../../utils/request");
const { clearSession, requireLogin, saveSession } = require("../../utils/session");

Page({
  data: {
    user: null,
    posts: [],
    activeCount: 0
  },
  onShow() {
    if (!requireLogin()) return;
    this.load();
  },
  async load() {
    const [me, postsData] = await Promise.all([
      request({ url: "/users/me/profile" }),
      request({ url: "/posts/mine" })
    ]);
    saveSession(getApp().globalData.token, me.user);
    const activeCount = postsData.posts.filter((post) => post.status === "published" || post.status === "matched").length;
    this.setData({ user: me.user, posts: postsData.posts, activeCount });
  },
  goApplications() {
    wx.navigateTo({ url: "/pages/applications/applications" });
  },
  goDrafts() {
    wx.navigateTo({ url: "/pages/drafts/drafts" });
  },
  goHome() {
    wx.navigateTo({ url: `/pages/user-home/user-home?id=${this.data.user.id}` });
  },
  editProfile() {
    wx.navigateTo({ url: "/pages/onboarding/onboarding" });
  },
  async cancelPost(event) {
    await request({ url: `/posts/${event.currentTarget.dataset.id}/cancel`, method: "POST" });
    wx.showToast({ title: "已取消" });
    this.load();
  },
  logout() {
    clearSession();
    wx.reLaunch({ url: "/pages/login/login" });
  }
});
