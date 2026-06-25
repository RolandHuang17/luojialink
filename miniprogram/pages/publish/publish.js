const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");
const { chooseAndUploadCover } = require("../../utils/avatar");

const categories = ["吃饭", "运动", "自习", "娱乐"];
const mediaTypes = [
  { value: "text", label: "文字" },
  { value: "image", label: "单图" },
  { value: "album", label: "相册" },
  { value: "video", label: "视频" }
];

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
    mediaType: "text",
    coverImage: "",
    images: [],
    videoUrl: "",
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
    mediaTypes,
    categoryIndex: 0,
    draftId: null,
    form: defaultForm(),
    saving: false,
    publishing: false,
    uploadingCover: false,
    allTags: [],
    selectedTags: [],
    displayTags: []
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
        mediaType: post.mediaType || "text",
        coverImage: post.coverImage || "",
        images: Array.isArray(post.images) ? post.images : [],
        videoUrl: post.videoUrl || "",
        startDate: start.date,
        startClock: start.time,
        endDate: end.date,
        endClock: end.time
      }
    });
    // 回显已选标签
    if (post.tags && Array.isArray(post.tags)) {
      this.updateSelectedTags(post.tags);
    }
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },
  onCategoryChange(event) {
    this.setData({ categoryIndex: Number(event.detail.value) });
  },
  switchMediaType(event) {
    const mediaType = event.currentTarget.dataset.type;
    const nextForm = { ...this.data.form, mediaType };
    if (mediaType === "text") {
      nextForm.coverImage = "";
      nextForm.images = [];
      nextForm.videoUrl = "";
    }
    if (mediaType === "image") {
      nextForm.images = [];
      nextForm.videoUrl = "";
    }
    if (mediaType === "album") {
      nextForm.videoUrl = "";
    }
    if (mediaType === "video") {
      nextForm.images = [];
    }
    this.setData({ form: nextForm });
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
      mediaType: form.mediaType || "text",
      coverImage: form.coverImage || undefined,
      images: form.images && form.images.length > 0 ? form.images : undefined,
      videoUrl: form.videoUrl || undefined,
      tags: this.data.selectedTags.length > 0 ? this.data.selectedTags : undefined,
      startTime: toDateTime(form.startDate, form.startClock).toISOString(),
      endTime: toDateTime(form.endDate, form.endClock).toISOString(),
      status
    };
  },
  async loadTags() {
    const data = await request({ url: "/tags" });
    this.setData({ allTags: data.tags });
    this.refreshDisplayTags(this.data.selectedTags);
  },
  refreshDisplayTags(selectedTags) {
    this.setData({
      displayTags: this.data.allTags.map((tag) => ({
        ...tag,
        selected: selectedTags.includes(tag.name)
      }))
    });
  },
  updateSelectedTags(selectedTags) {
    this.setData({ selectedTags });
    this.refreshDisplayTags(selectedTags);
  },
  toggleTag(event) {
    const name = event.currentTarget.dataset.name;
    let tags = this.data.selectedTags.slice();
    const idx = tags.indexOf(name);
    if (idx >= 0) tags.splice(idx, 1);
    else if (tags.length < 8) tags.push(name);
    this.updateSelectedTags(tags);
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
  async chooseAlbumImages() {
    if (this.data.uploadingCover) return;
    const remain = Math.max(0, 9 - (this.data.form.images || []).length);
    if (!remain) {
      wx.showToast({ title: "最多添加 9 张图", icon: "none" });
      return;
    }
    this.setData({ uploadingCover: true });
    try {
      const urls = await chooseAndUploadCover({ count: remain });
      const images = (this.data.form.images || []).concat(urls).slice(0, 9);
      this.setData({
        "form.images": images,
        "form.coverImage": images[0] || this.data.form.coverImage
      });
    } catch (e) {
      if (e && e.errMsg && e.errMsg.includes("cancel")) return;
      console.error(e);
    } finally {
      this.setData({ uploadingCover: false });
    }
  },
  removeAlbumImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const images = (this.data.form.images || []).filter((_item, idx) => idx !== index);
    this.setData({
      "form.images": images,
      "form.coverImage": images[0] || ""
    });
  },
  onVideoUrlInput(event) {
    this.setData({ "form.videoUrl": event.detail.value });
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
    if (form.mediaType === "image" && !form.coverImage) {
      wx.showToast({ title: "选一张封面图吧", icon: "none" });
      return false;
    }
    if (form.mediaType === "album" && (!form.images || form.images.length === 0)) {
      wx.showToast({ title: "至少添加一张相册图", icon: "none" });
      return false;
    }
    if (form.mediaType === "video" && !form.videoUrl.trim()) {
      wx.showToast({ title: "填一下视频链接吧", icon: "none" });
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
      this.updateSelectedTags([]);
      wx.switchTab({ url: "/pages/square/square" });
    } finally {
      this.setData({ publishing: false });
    }
  }
});
