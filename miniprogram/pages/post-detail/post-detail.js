const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

Page({
  data: {
    id: null,
    post: null,
    conflict: null,
    applying: false
  },
  onLoad(query) {
    if (!requireLogin()) return;
    this.setData({ id: Number(query.id) });
    this.loadPost(Number(query.id));
  },
  async loadPost(id) {
    const data = await request({ url: `/posts/${id}` });
    this.setData({ post: data.post });
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
        data: { applyMessage: "我想一起参与这个结伴请求。" }
      });
      wx.showToast({ title: "申请已发送" });
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ applying: false });
    }
  },
  reportPost() {
    if (!this.data.id) return;
    wx.navigateTo({
      url: `/pages/report/report?targetType=post&targetId=${this.data.id}`
    });
  }
});
