const { request } = require("../../utils/request");
const { requireLogin, saveSession } = require("../../utils/session");

const questions = [
  {
    title: "周末更想怎么恢复精力？",
    options: [
      { label: "约朋友聊聊天、出去走走", value: "E" },
      { label: "自己待着充电、做喜欢的事", value: "I" }
    ]
  },
  {
    title: "你更常注意到什么？",
    options: [
      { label: "眼前具体的事和细节", value: "S" },
      { label: "背后的可能性和灵感", value: "N" }
    ]
  },
  {
    title: "做决定时你更依赖？",
    options: [
      { label: "逻辑和原则", value: "T" },
      { label: "感受和彼此的关系", value: "F" }
    ]
  },
  {
    title: "安排事情时你更喜欢？",
    options: [
      { label: "提前计划，心里有数", value: "J" },
      { label: "留点弹性，随机应变", value: "P" }
    ]
  }
];

function buildMbtiPreview(mbti) {
  return mbti.map((char) => char || "?").join("");
}

Page({
  data: {
    questions,
    questionIndex: 0,
    currentQuestion: questions[0],
    mbti: ["", "", "", ""],
    mbtiPreview: "????",
    saving: false
  },
  onLoad(query) {
    if (!requireLogin()) return;
    const incoming = query.mbti ? String(query.mbti).split("") : [];
    const mbti = incoming.length === 4 ? incoming : ["", "", "", ""];
    this.setData({ mbti, mbtiPreview: buildMbtiPreview(mbti) });
  },
  selectOption(event) {
    const value = event.currentTarget.dataset.value;
    const mbti = this.data.mbti.slice();
    mbti[this.data.questionIndex] = value;
    this.setData({ mbti, mbtiPreview: buildMbtiPreview(mbti) });
  },
  next() {
    if (!this.data.mbti[this.data.questionIndex]) {
      wx.showToast({ title: "先选一个最像你的", icon: "none" });
      return;
    }
    if (this.data.questionIndex < this.data.questions.length - 1) {
      const questionIndex = this.data.questionIndex + 1;
      this.setData({ questionIndex, currentQuestion: this.data.questions[questionIndex] });
      return;
    }
    this.save();
  },
  prev() {
    if (this.data.questionIndex > 0) {
      const questionIndex = this.data.questionIndex - 1;
      this.setData({ questionIndex, currentQuestion: this.data.questions[questionIndex] });
    }
  },
  async save() {
    if (this.data.saving) return;
    const mbti = this.data.mbti.join("");
    if (mbti.length !== 4) {
      wx.showToast({ title: "请完成全部 4 题", icon: "none" });
      return;
    }
    this.setData({ saving: true });
    try {
      const data = await request({
        url: "/users/me/profile",
        method: "PUT",
        data: { mbti }
      });
      saveSession(getApp().globalData.token, data.user);

      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage) {
        if (prevPage.route === "pages/profile-edit/profile-edit") {
          prevPage.setData({ mbtiText: mbti });
        }
        if (prevPage.route === "pages/user-home/user-home" && prevPage.data.user) {
          prevPage.setData({ user: { ...prevPage.data.user, mbti } });
        }
      }

      wx.showToast({ title: `已更新为 ${mbti}` });
      setTimeout(() => wx.navigateBack(), 500);
    } finally {
      this.setData({ saving: false });
    }
  }
});
