const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");
const { formatDateTime } = require("../../utils/format");

const catColors = { "吃饭": "food", "运动": "sport", "自习": "study", "娱乐": "fun" };

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
        color: catColors[data.post.category] || "all",
        timeText: `${formatDateTime(data.post.startTime)} - ${formatDateTime(data.post.endTime)}`
      }
    });
    this.loadConflicts(id);
  },
  async loadConflicts(id) {
    try {
      const data = await request({ url: `/calendar/conflicts?postId=${id}`, silent: true });
      this.setData({ conflict: data });
    } catch (error) {
      console.error(error);
    }
  },
  async apply() {
    if (this.data.conflict && this.data.conflict.blocksApply) {
      wx.showModal({
        title: "时间冲突",
        content: "这个活动和你已有的安排撞期了，先调整时间再申请吧。",
        showCancel: false,
        confirmText: "知道了"
      });
      return;
    }
    if (this.data.applying) return;
    this.setData({ applying: true });
    try {
      await request({
        url: `/posts/${this.data.id}/applications`,
        method: "POST",
        data: { applyMessage: "想一起参加这个计划，先从这次活动开始认识吧。" }
      });
      wx.showToast({ title: "申请已发送，去消息里看看" });
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
