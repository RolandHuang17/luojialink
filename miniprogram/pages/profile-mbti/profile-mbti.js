const { request } = require("../../utils/request");
const { requireLogin, saveSession } = require("../../utils/session");

const questions = [
  {
    title: "你恢复能量的方式更像？",
    options: [
      { label: "和人交流更有劲", value: "E" },
      { label: "独处沉淀更舒服", value: "I" }
    ]
  },
  {
    title: "你更容易注意到？",
    options: [
      { label: "现实细节和经验", value: "S" },
      { label: "可能性和灵感", value: "N" }
    ]
  },
  {
    title: "做决定时你更依赖？",
    options: [
      { label: "逻辑原则", value: "T" },
      { label: "感受关系", value: "F" }
    ]
  },
  {
    title: "安排事情时你更喜欢？",
    options: [
      { label: "提前计划", value: "J" },
      { label: "保持弹性", value: "P" }
    ]
  }
];

Page({
  data: {
    questions,
    index: 0,
    currentQuestion: questions[0],
    mbti: ["E", "N", "F", "P"],
    saving: false
  },
  onLoad(query) {
    if (!requireLogin()) return;
    const mbti = query.mbti && query.mbti.length === 4 ? query.mbti.split("") : this.data.mbti;
    this.setData({ mbti });
    this.refreshQuestion();
  },
  refreshQuestion() {
    this.setData({ currentQuestion: questions[this.data.index] });
  },
  selectOption(event) {
    const mbti = this.data.mbti.slice();
    mbti[this.data.index] = event.currentTarget.dataset.value;
    this.setData({ mbti });
  },
  prev() {
    if (this.data.index <= 0) return;
    this.setData({ index: this.data.index - 1 });
    this.refreshQuestion();
  },
  next() {
    if (this.data.index < questions.length - 1) {
      this.setData({ index: this.data.index + 1 });
      this.refreshQuestion();
      return;
    }
    this.save();
  },
  async save() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      const data = await request({
        url: "/users/me/profile",
        method: "PUT",
        data: { mbti: this.data.mbti.join("") }
      });
      saveSession(getApp().globalData.token, data.user);
      wx.showToast({ title: "已更新" });
      setTimeout(() => wx.navigateBack(), 500);
    } finally {
      this.setData({ saving: false });
    }
  }
});
