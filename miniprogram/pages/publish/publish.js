const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");
const { chooseAndUploadCover } = require("../../utils/avatar");

const categories = ["吃饭", "运动", "自习", "娱乐"];

function defaultDateTime(hours) {
  const value = new Date(Date.now() + hours * 60 * 60 * 1000);
  const date = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  const time = `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

function defaultForm() {
  const start = defaultDateTime(24);
  const end = defaultDateTime(25);
  return {
    title: "",
    detail: "",
    activityLocation: "",
    coverImage: "",
    startDate: start.date,
    startClock: start.time,
    endDate: end.date,
    endClock: end.time
  };
}

function toDateTime(date, clock) {
  return new Date(`${date}T${clock}:00`);
}

function splitDateTime(value) {
  return {
    date: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`,
    time: `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
  };
}

Page({
  data: {
    categories,
    categoryIndex: 0,
    draftId: null,
    form: defaultForm(),
    saving: false,
    publishing: false,
    uploadingCover: false,
    allTags: [],
    selectedTags: []
  },
  onLoad(query) {
    if (!requireLogin()) return;
    this.loadTags();
    if (query.id) {
      this.setData({ draftId: Number(query.id) });
      this.loadDraft(Number(query.id));
    }
  },
  onShow() {
    if (!requireLogin()) return;
    this.selectTab();
    const editingDraftId = wx.getStorageSync("editingDraftId");
    if (editingDraftId && Number(editingDraftId) !== this.data.draftId) {
      wx.removeStorageSync("editingDraftId");
      this.setData({ draftId: Number(editingDraftId) });
      this.loadDraft(Number(editingDraftId));
    }
  },
  selectTab() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },
  async loadDraft(id) {
    const data = await request({ url: `/posts/${id}` });
    const post = data.post;
    const start = splitDateTime(new Date(post.startTime));
    const end = splitDateTime(new Date(post.endTime));
    this.setData({
      categoryIndex: Math.max(0, categories.indexOf(post.category)),
      form: {
        title: post.title,
        detail: post.detail,
        activityLocation: post.activityLocation,
        coverImage: post.coverImage || "",
        startDate: start.date,
        startClock: start.time,
        endDate: end.date,
        endClock: end.time
      }
    });
    // 回显已选标签
    if (post.tags && Array.isArray(post.tags)) {
      this.setData({ selectedTags: post.tags });
    }
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },
  onCategoryChange(event) {
    this.setData({ categoryIndex: Number(event.detail.value) });
  },
  onDateChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
    this.ensureValidRange(key);
  },
  ensureValidRange(changedKey) {
    const form = this.data.form;
    const start = toDateTime(form.startDate, form.startClock);
    const end = toDateTime(form.endDate, form.endClock);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start < end) return;
    if (changedKey === "endDate" || changedKey === "endClock") {
      const nextStart = splitDateTime(new Date(end.getTime() - 60 * 60 * 1000));
      this.setData({
        "form.startDate": nextStart.date,
        "form.startClock": nextStart.time
      });
      return;
    }
    const nextEnd = splitDateTime(new Date(start.getTime() + 60 * 60 * 1000));
    this.setData({ "form.endDate": nextEnd.date, "form.endClock": nextEnd.time });
  },
  buildPayload(status) {
    const form = this.data.form;
    return {
      title: form.title,
      detail: form.detail,
      category: categories[this.data.categoryIndex],
      activityLocation: form.activityLocation,
      coverImage: form.coverImage || undefined,
      tags: this.data.selectedTags.length > 0 ? this.data.selectedTags : undefined,
      startTime: toDateTime(form.startDate, form.startClock).toISOString(),
      endTime: toDateTime(form.endDate, form.endClock).toISOString(),
      status
    };
  },
  async loadTags() {
    const data = await request({ url: "/tags" });
    this.setData({ allTags: data.tags });
  },
  toggleTag(event) {
    const name = event.currentTarget.dataset.name;
    let tags = this.data.selectedTags.slice();
    const idx = tags.indexOf(name);
    if (idx >= 0) tags.splice(idx, 1);
    else if (tags.length < 8) tags.push(name);
    this.setData({ selectedTags: tags });
  },
  async chooseCover() {
    if (this.data.uploadingCover) return;
    this.setData({ uploadingCover: true });
    try {
      const url = await chooseAndUploadCover();
      this.setData({ "form.coverImage": url });
    } catch (e) {
      if (e && e.errMsg && e.errMsg.includes("cancel")) return;
    } finally {
      this.setData({ uploadingCover: false });
    }
  },
  validateRequired() {
    const form = this.data.form;
    if (!form.title.trim()) {
      wx.showToast({ title: "先起个标题吧", icon: "none" });
      return false;
    }
    if (!form.detail.trim()) {
      wx.showToast({ title: "写写具体打算吧", icon: "none" });
      return false;
    }
    if (!form.activityLocation.trim()) {
      wx.showToast({ title: "告诉大家在哪见", icon: "none" });
      return false;
    }
    return true;
  },
  async saveDraft() {
    if (this.data.saving) return;
    if (!this.validateRequired()) return;
    this.setData({ saving: true });
    try {
      const payload = this.buildPayload("draft");
      if (this.data.draftId) {
        await request({ url: `/posts/${this.data.draftId}`, method: "PUT", data: payload });
      } else {
        const data = await request({ url: "/posts/drafts", method: "POST", data: payload });
        this.setData({ draftId: data.draft.id });
      }
      wx.showToast({ title: "草稿存好啦" });
    } finally {
      this.setData({ saving: false });
    }
  },
  async submit() {
    if (this.data.publishing) return;
    if (!this.validateRequired()) return;
    this.setData({ publishing: true });
    try {
      const payload = this.buildPayload("published");
      if (this.data.draftId) {
        await request({ url: `/posts/${this.data.draftId}`, method: "PUT", data: payload });
      } else {
        await request({ url: "/posts", method: "POST", data: payload });
      }
      wx.showToast({ title: "发布成功，去广场看看吧" });
      this.setData({ draftId: null, categoryIndex: 0, form: defaultForm() });
      wx.switchTab({ url: "/pages/square/square" });
    } finally {
      this.setData({ publishing: false });
    }
  }
});
