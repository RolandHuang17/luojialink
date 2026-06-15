const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

Page({
  data: {
    drafts: []
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadDrafts();
  },
  async loadDrafts() {
    const data = await request({ url: "/posts/drafts" });
    this.setData({ drafts: data.drafts });
  },
  editDraft(event) {
    wx.setStorageSync("editingDraftId", event.currentTarget.dataset.id);
    wx.switchTab({ url: "/pages/publish/publish" });
  },
  async deleteDraft(event) {
    await request({ url: `/posts/${event.currentTarget.dataset.id}`, method: "DELETE" });
    wx.showToast({ title: "草稿已删除" });
    this.loadDrafts();
  }
});
