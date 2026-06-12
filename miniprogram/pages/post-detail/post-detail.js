const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

Page({
  data: {
    id: null,
    post: null
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
  apply() {
    wx.showToast({ title: "申请接口下一步接入", icon: "none" });
  }
});
