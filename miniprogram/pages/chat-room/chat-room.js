const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

Page({
  data: {
    id: null,
    type: "",
    activeItem: null,
    messages: [],
    recommendation: null,
    messageText: "",
    sending: false
  },
  onLoad(query) {
    if (!requireLogin()) return;
    this.setData({ id: Number(query.id), type: query.type || "session" });
    this.load();
  },
  async load() {
    if (this.data.type === "application") {
      const data = await request({ url: `/sessions/applications/${this.data.id}` });
      this.setData({ activeItem: data.application, messages: [], recommendation: null });
      return;
    }
    await this.loadMessages(this.data.id);
    this.loadRecommendation(this.data.id);
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
    if (this.data.sending || !content || !this.data.activeItem || this.data.activeItem.type !== "session") return;
    this.setData({ sending: true });
    try {
      await request({ url: `/sessions/${this.data.activeItem.id}/messages`, method: "POST", data: { content } });
      this.setData({ messageText: "" });
      await this.loadMessages(this.data.activeItem.id);
    } finally {
      this.setData({ sending: false });
    }
  },
  async acceptApplication() {
    const data = await request({ url: `/applications/${this.data.activeItem.applicationId}/accept`, method: "POST" });
    wx.showToast({ title: "已通过" });
    wx.redirectTo({ url: `/pages/chat-room/chat-room?type=session&id=${data.session.id}` });
  },
  async rejectApplication() {
    await request({ url: `/applications/${this.data.activeItem.applicationId}/reject`, method: "POST" });
    wx.showToast({ title: "已拒绝" });
    setTimeout(() => wx.navigateBack(), 500);
  },
  async withdrawApplication() {
    await request({ url: `/applications/${this.data.activeItem.applicationId}/withdraw`, method: "POST" });
    wx.showToast({ title: "已撤回" });
    setTimeout(() => wx.navigateBack(), 500);
  },
  async exchangeContact() {
    if (!this.data.activeItem || this.data.activeItem.type !== "session") return;
    const data = await request({ url: `/sessions/${this.data.activeItem.id}/exchange-contact`, method: "POST" });
    this.setData({ activeItem: data.session });
    wx.showToast({ title: data.session.contactVisible ? "联系方式已互换" : "已发送互换意愿" });
  },
  goPeerHome() {
    if (!this.data.activeItem || !this.data.activeItem.peer) return;
    wx.navigateTo({ url: `/pages/user-home/user-home?id=${this.data.activeItem.peer.id}` });
  }
});
