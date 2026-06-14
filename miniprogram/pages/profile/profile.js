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
    this.selectTab();
    this.load();
  },
  selectTab() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
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
  goDrafts() {
    wx.navigateTo({ url: "/pages/drafts/drafts" });
  },
  goHome() {
    wx.navigateTo({ url: `/pages/user-home/user-home?id=${this.data.user.id}` });
  },
  editProfile() {
    wx.navigateTo({ url: "/pages/profile-edit/profile-edit" });
  },
  goPostDetail(event) {
    wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${event.currentTarget.dataset.id}` });
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
