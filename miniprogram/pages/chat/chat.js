const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

Page({
  data: {
    sessions: [],
    activeSessionId: null,
    activeSession: null,
    messages: [],
    commonFree: [],
    recommendation: null,
    recommendedPois: [],
    messageText: "",
    loading: false,
    sending: false,
    recommendationLoading: false
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadSessions();
  },
  async loadSessions() {
    this.setData({ loading: true });
    try {
      const data = await request({ url: "/sessions" });
      const activeSessionStillExists = data.sessions.find((item) => item.id === this.data.activeSessionId);
      this.setData({
        sessions: data.sessions,
        activeSession: activeSessionStillExists || this.data.activeSession
      });
      if (activeSessionStillExists) {
        this.loadMessages(activeSessionStillExists.id);
        this.loadCommonFree(activeSessionStillExists.id);
        this.loadRecommendation(activeSessionStillExists.id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  selectSession(event) {
    const id = Number(event.currentTarget.dataset.id);
    const activeSession = this.data.sessions.find((item) => item.id === id);
    this.setData({
      activeSessionId: id,
      activeSession,
      messages: [],
      commonFree: [],
      recommendation: null,
      recommendedPois: []
    });
    this.loadMessages(id);
    this.loadCommonFree(id);
    this.loadRecommendation(id);
  },
  async loadMessages(sessionId) {
    try {
      const data = await request({ url: `/sessions/${sessionId}/messages` });
      this.setData({ messages: data.messages });
    } catch (error) {
      console.error(error);
    }
  },
  async loadCommonFree(sessionId) {
    try {
      const data = await request({ url: `/calendar/common-free?sessionId=${sessionId}` });
      this.setData({ commonFree: data.commonFree });
    } catch (error) {
      console.error(error);
    }
  },
  async loadRecommendation(sessionId) {
    this.setData({ recommendationLoading: true });
    try {
      const data = await request({ url: `/recommendations/session/${sessionId}` });
      this.setData({
        recommendation: data.recommendation,
        recommendedPois: data.pois || [],
        commonFree: data.commonFree || this.data.commonFree
      });
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ recommendationLoading: false });
    }
  },
  onInput(event) {
    this.setData({ messageText: event.detail.value });
  },
  async sendMessage() {
    const content = this.data.messageText.trim();
    if (!content || !this.data.activeSessionId || this.data.sending) return;
    this.setData({ sending: true });
    try {
      await request({
        url: `/sessions/${this.data.activeSessionId}/messages`,
        method: "POST",
        data: { content }
      });
      this.setData({ messageText: "" });
      await this.loadMessages(this.data.activeSessionId);
      this.loadSessions();
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ sending: false });
    }
  },
  reportSession() {
    if (!this.data.activeSessionId) return;
    wx.navigateTo({
      url: `/pages/report/report?targetType=session&targetId=${this.data.activeSessionId}`
    });
  }
});
