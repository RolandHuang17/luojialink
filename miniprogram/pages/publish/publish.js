const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

const categories = ["吃饭", "运动", "自习", "娱乐"];

function defaultDateTime(hours) {
  const value = new Date(Date.now() + hours * 60 * 60 * 1000);
  const date = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  const time = `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

function defaultForm() {
  return {
    title: "",
    detail: "",
    activityLocation: "",
    startDate: defaultDateTime(3).date,
    startClock: defaultDateTime(3).time,
    endDate: defaultDateTime(4).date,
    endClock: defaultDateTime(4).time
  };
}

Page({
  data: {
    categories,
    categoryIndex: 0,
    draftId: null,
    form: defaultForm(),
    saving: false,
    publishing: false
  },
  onLoad(query) {
    if (!requireLogin()) return;
    if (query.id) {
      this.setData({ draftId: Number(query.id) });
      this.loadDraft(Number(query.id));
    }
  },
  onShow() {
    const editingDraftId = wx.getStorageSync("editingDraftId");
    if (editingDraftId && Number(editingDraftId) !== this.data.draftId) {
      wx.removeStorageSync("editingDraftId");
      this.setData({ draftId: Number(editingDraftId) });
      this.loadDraft(Number(editingDraftId));
    }
  },
  async loadDraft(id) {
    const data = await request({ url: `/posts/${id}` });
    const post = data.post;
    const start = new Date(post.startTime);
    const end = new Date(post.endTime);
    this.setData({
      categoryIndex: Math.max(0, categories.indexOf(post.category)),
      form: {
        title: post.title,
        detail: post.detail,
        activityLocation: post.activityLocation,
        startDate: start.toISOString().slice(0, 10),
        startClock: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
        endDate: end.toISOString().slice(0, 10),
        endClock: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
      }
    });
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },
  onCategoryChange(event) {
    this.setData({ categoryIndex: Number(event.detail.value) });
  },
  onDateChange(event) {
    this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value });
  },
  buildPayload(status) {
    const form = this.data.form;
    return {
      title: form.title,
      detail: form.detail,
      category: categories[this.data.categoryIndex],
      activityLocation: form.activityLocation,
      startTime: new Date(`${form.startDate}T${form.startClock}:00`).toISOString(),
      endTime: new Date(`${form.endDate}T${form.endClock}:00`).toISOString(),
      status
    };
  },
  async saveDraft() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      const payload = this.buildPayload("draft");
      if (this.data.draftId) {
        await request({ url: `/posts/${this.data.draftId}`, method: "PUT", data: payload });
      } else {
        const data = await request({ url: "/posts/drafts", method: "POST", data: payload });
        this.setData({ draftId: data.draft.id });
      }
      wx.showToast({ title: "草稿已保存" });
    } finally {
      this.setData({ saving: false });
    }
  },
  async submit() {
    if (this.data.publishing) return;
    this.setData({ publishing: true });
    try {
      const payload = this.buildPayload("published");
      if (this.data.draftId) {
        await request({ url: `/posts/${this.data.draftId}`, method: "PUT", data: payload });
      } else {
        await request({ url: "/posts", method: "POST", data: payload });
      }
      wx.showToast({ title: "发布成功" });
      this.setData({ draftId: null, categoryIndex: 0, form: defaultForm() });
      wx.switchTab({ url: "/pages/square/square" });
    } finally {
      this.setData({ publishing: false });
    }
  }
});
