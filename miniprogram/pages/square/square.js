const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");
const { formatDateTime } = require("../../utils/format");

Page({
  data: {
    posts: []
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadPosts();
  },
  async loadPosts() {
    try {
      const data = await request({ url: "/posts" });
      this.setData({
        posts: data.posts.map((post) => ({
          ...post,
          timeText: `${formatDateTime(post.startTime)} - ${formatDateTime(post.endTime)}`
        }))
      });
    } catch (error) {
      console.error(error);
    }
  },
  goPublish() {
    wx.navigateTo({ url: "/pages/publish/publish" });
  },
  goDetail(event) {
    wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${event.currentTarget.dataset.id}` });
  }
});
