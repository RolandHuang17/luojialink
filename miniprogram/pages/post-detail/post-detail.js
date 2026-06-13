const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

Page({
  data: {
    id: null,
    post: null,
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
  }
});
