const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");
const { formatDateTime } = require("../../utils/format");

Page({
  data: {
    id: null,
    post: null,
    conflict: null,
    applying: false
  },
  onLoad(query) {
    if (!requireLogin()) return;
    const id = Number(query.id);
    this.setData({ id });
    this.loadPost(id);
  },
  async loadPost(id) {
    const data = await request({ url: `/posts/${id}` });
    this.setData({
      post: {
        ...data.post,
        timeText: `${formatDateTime(data.post.startTime)} - ${formatDateTime(data.post.endTime)}`
      }
    });
    this.loadConflicts(id);
  },
  async loadConflicts(id) {
    try {
      const data = await request({ url: `/calendar/conflicts?postId=${id}` });
      this.setData({ conflict: data });
    } catch (error) {
      console.error(error);
    }
  },
  async apply() {
    if (this.data.applying) return;
    this.setData({ applying: true });
    try {
      await request({
        url: `/posts/${this.data.id}/applications`,
        method: "POST",
        data: { applyMessage: "我想一起参加这个计划，可以先从这个活动开始认识。" }
      });
      wx.showToast({ title: "申请已发送" });
      setTimeout(() => wx.switchTab({ url: "/pages/chat/chat" }), 600);
    } finally {
      this.setData({ applying: false });
    }
  },
  goUser() {
    if (!this.data.post) return;
    wx.navigateTo({ url: `/pages/user-home/user-home?id=${this.data.post.publisher.id}` });
  },
  reportPost() {
    if (!this.data.id) return;
    wx.navigateTo({ url: `/pages/report/report?targetType=post&targetId=${this.data.id}` });
  }
});
