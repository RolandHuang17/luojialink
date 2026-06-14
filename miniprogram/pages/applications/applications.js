const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

Page({
  data: {
    received: [],
    mine: [],
    loading: false
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadApplications();
  },
  async loadApplications() {
    this.setData({ loading: true });
    try {
      const [receivedData, mineData] = await Promise.all([
        request({ url: "/applications/received" }),
        request({ url: "/applications/me" })
      ]);
      this.setData({
        received: receivedData.applications,
        mine: mineData.applications
      });
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  async accept(event) {
    const id = event.currentTarget.dataset.id;
    try {
      await request({ url: `/applications/${id}/accept`, method: "POST" });
      wx.showToast({ title: "已确认" });
      this.loadApplications();
    } catch (error) {
      console.error(error);
    }
  },
  async reject(event) {
    const id = event.currentTarget.dataset.id;
    try {
      await request({ url: `/applications/${id}/reject`, method: "POST" });
      wx.showToast({ title: "已拒绝" });
      this.loadApplications();
    } catch (error) {
      console.error(error);
    }
  },
  async withdraw(event) {
    const id = event.currentTarget.dataset.id;
    try {
      await request({ url: `/applications/${id}/withdraw`, method: "POST" });
      wx.showToast({ title: "已撤回" });
      this.loadApplications();
    } catch (error) {
      console.error(error);
    }
  }
});
