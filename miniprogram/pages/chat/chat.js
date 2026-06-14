const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

Page({
  data: {
    items: [],
    activeItem: null,
    messages: [],
    recommendation: null,
    messageText: "",
    loading: false,
    sending: false
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadItems();
  },
  async loadItems() {
    this.setData({ loading: true });
    try {
      const data = await request({ url: "/sessions" });
      this.setData({ items: data.items || data.sessions || [] });
      if (this.data.activeItem) {
        const fresh = (data.items || []).find((item) => item.type === this.data.activeItem.type && item.id === this.data.activeItem.id);
        if (fresh) this.selectItemByData(fresh);
      }
    } finally {
      this.setData({ loading: false });
    }
  },
  selectItem(event) {
    const id = Number(event.currentTarget.dataset.id);
    const type = event.currentTarget.dataset.type;
    const item = this.data.items.find((entry) => entry.id === id && entry.type === type);
    if (item) this.selectItemByData(item);
  },
  selectItemByData(item) {
    this.setData({ activeItem: item, messages: [], recommendation: null });
    if (item.type === "session") {
      this.loadMessages(item.id);
      this.loadRecommendation(item.id);
    }
  },
  async loadMessages(sessionId) {
    const data = await request({ url: `/sessions/${sessionId}/messages` });
    this.setData({ messages: data.messages, activeItem: data.session });
  },
  async loadRecommendation(sessionId) {
    try {
      const data = await request({ url: `/recommendations/session/${sessionId}` });
      this.setData({ recommendation: data.recommendation });
    } catch (error) {
      console.error(error);
    }
  },
  onInput(event) {
    this.setData({ messageText: event.detail.value });
  },
  async sendMessage() {
    const content = this.data.messageText.trim();
    if (!content || !this.data.activeItem || this.data.activeItem.type !== "session") return;
    this.setData({ sending: true });
    try {
      await request({ url: `/sessions/${this.data.activeItem.id}/messages`, method: "POST", data: { content } });
      this.setData({ messageText: "" });
      await this.loadMessages(this.data.activeItem.id);
      this.loadItems();
    } finally {
      this.setData({ sending: false });
    }
  },
  async acceptApplication() {
    await request({ url: `/applications/${this.data.activeItem.applicationId}/accept`, method: "POST" });
    wx.showToast({ title: "已通过" });
    this.setData({ activeItem: null });
    this.loadItems();
  },
  async rejectApplication() {
    await request({ url: `/applications/${this.data.activeItem.applicationId}/reject`, method: "POST" });
    wx.showToast({ title: "已拒绝" });
    this.setData({ activeItem: null });
    this.loadItems();
  },
  async withdrawApplication() {
    await request({ url: `/applications/${this.data.activeItem.applicationId}/withdraw`, method: "POST" });
    wx.showToast({ title: "已撤回" });
    this.setData({ activeItem: null });
    this.loadItems();
  },
  async exchangeContact() {
    if (!this.data.activeItem || this.data.activeItem.type !== "session") return;
    const data = await request({ url: `/sessions/${this.data.activeItem.id}/exchange-contact`, method: "POST" });
    this.setData({ activeItem: data.session });
    wx.showToast({ title: data.session.contactVisible ? "联系方式已互换" : "已发送互换意愿" });
  },
  reportSession() {
    if (!this.data.activeItem) return;
    const targetType = this.data.activeItem.type === "session" ? "session" : "post";
    const targetId = this.data.activeItem.type === "session" ? this.data.activeItem.id : this.data.activeItem.postId;
    wx.navigateTo({ url: `/pages/report/report?targetType=${targetType}&targetId=${targetId}` });
  }
});
