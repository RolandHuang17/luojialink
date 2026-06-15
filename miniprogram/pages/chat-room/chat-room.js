const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");
const { decorateMessages, getEmojiPanel } = require("../../utils/emoji");

Page({
  data: {
    id: null,
    type: "",
    activeItem: null,
    messages: [],
    recommendation: null,
    currentIcebreaker: "",
    icebreakerLoading: false,
    messageText: "",
    sending: false,
    showEmojiPanel: false,
    emojiList: getEmojiPanel()
  },
  onLoad(query) {
    if (!requireLogin()) return;
    this.setData({ id: Number(query.id), type: query.type || "session" });
    this.load();
  },
  async load() {
    if (this.data.type === "application") {
      const data = await request({ url: `/sessions/applications/${this.data.id}` });
      this.setData({ activeItem: data.application, messages: [], recommendation: null, currentIcebreaker: "" });
      return;
    }
    await this.loadMessages(this.data.id);
    this.loadRecommendation(this.data.id);
  },
  async loadMessages(sessionId) {
    const data = await request({ url: `/sessions/${sessionId}/messages` });
    this.setData({ messages: decorateMessages(data.messages), activeItem: data.session });
  },
  async loadRecommendation(sessionId) {
    try {
      const data = await request({ url: `/recommendations/session/${sessionId}`, silent: true });
      this.setData({
        recommendation: data.recommendation,
        currentIcebreaker: data.recommendation ? data.recommendation.icebreaker : ""
      });
    } catch (error) {
      console.error(error);
    }
  },
  onInput(event) {
    this.setData({ messageText: event.detail.value });
  },
  toggleEmojiPanel() {
    this.setData({ showEmojiPanel: !this.data.showEmojiPanel });
  },
  insertEmoji(event) {
    const key = event.currentTarget.dataset.key;
    if (!key) return;
    this.setData({ messageText: `${this.data.messageText}${key}` });
  },
  useIcebreaker() {
    if (!this.data.currentIcebreaker) return;
    this.setData({ messageText: this.data.currentIcebreaker, showEmojiPanel: false });
    wx.showToast({ title: "已填入聊天框", icon: "none" });
  },
  async refreshIcebreaker() {
    if (this.data.icebreakerLoading || !this.data.activeItem || this.data.activeItem.type !== "session") return;
    this.setData({ icebreakerLoading: true });
    try {
      const data = await request({
        url: `/recommendations/session/${this.data.activeItem.id}/icebreaker/refresh`,
        method: "POST",
        data: { current: this.data.currentIcebreaker }
      });
      this.setData({ currentIcebreaker: data.icebreaker });
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ icebreakerLoading: false });
    }
  },
  async sendMessage() {
    const content = this.data.messageText.trim();
    if (
      this.data.sending ||
      !content ||
      !this.data.activeItem ||
      this.data.activeItem.type !== "session" ||
      this.data.activeItem.status !== "active"
    ) {
      return;
    }
    this.setData({ sending: true });
    try {
      await request({ url: `/sessions/${this.data.activeItem.id}/messages`, method: "POST", data: { content } });
      this.setData({ messageText: "", showEmojiPanel: false });
      await this.loadMessages(this.data.activeItem.id);
    } finally {
      this.setData({ sending: false });
    }
  },
  async acceptApplication() {
    const data = await request({ url: `/applications/${this.data.activeItem.applicationId}/accept`, method: "POST" });
    wx.showToast({ title: "已同意，可以开聊啦" });
    wx.redirectTo({ url: `/pages/chat-room/chat-room?type=session&id=${data.session.id}` });
  },
  async rejectApplication() {
    await request({ url: `/applications/${this.data.activeItem.applicationId}/reject`, method: "POST" });
    wx.showToast({ title: "已婉拒" });
    setTimeout(() => wx.navigateBack(), 500);
  },
  async withdrawApplication() {
    await request({ url: `/applications/${this.data.activeItem.applicationId}/withdraw`, method: "POST" });
    wx.showToast({ title: "申请已撤回" });
    setTimeout(() => wx.navigateBack(), 500);
  },
  async exchangeContact() {
    if (!this.data.activeItem || this.data.activeItem.type !== "session" || this.data.activeItem.status !== "active") return;
    const data = await request({ url: `/sessions/${this.data.activeItem.id}/exchange-contact`, method: "POST" });
    this.setData({ activeItem: data.session });
    wx.showToast({ title: data.session.contactVisible ? "微信号已互换" : "已发送互换请求" });
  },
  goPeerHome() {
    if (!this.data.activeItem || !this.data.activeItem.peer) return;
    wx.navigateTo({ url: `/pages/user-home/user-home?id=${this.data.activeItem.peer.id}` });
  },
  promptCancelSession() {
    if (!this.data.activeItem || this.data.activeItem.type !== "session" || this.data.activeItem.status !== "active") return;
    wx.showModal({
      title: "取消约好",
      content: "",
      editable: true,
      placeholderText: "请填写取消理由（必填）",
      confirmText: "确认取消",
      cancelText: "再想想",
      success: (res) => {
        if (!res.confirm) return;
        const reason = (res.content || "").trim();
        if (!reason) {
          wx.showToast({ title: "请填写取消理由", icon: "none" });
          return;
        }
        this.cancelSession(reason);
      }
    });
  },
  async cancelSession(reason) {
    if (!this.data.activeItem || this.data.activeItem.type !== "session") return;
    try {
      await request({
        url: `/sessions/${this.data.activeItem.id}/cancel`,
        method: "POST",
        data: { reason }
      });
      wx.showToast({ title: "已取消约好", icon: "none" });
      this.setData({ recommendation: null, currentIcebreaker: "", showEmojiPanel: false, messageText: "" });
      await this.loadMessages(this.data.activeItem.id);
    } catch (error) {
      console.error(error);
    }
  }
});
