const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");
const { formatDateTime, formatPostedAt } = require("../../utils/format");

const categories = [
  { name: "全部", color: "all" },
  { name: "吃饭", color: "food" },
  { name: "运动", color: "sport" },
  { name: "自习", color: "study" },
  { name: "娱乐", color: "fun" }
];

const meshClasses = [
  "mesh-warm", "mesh-peach", "mesh-sunset",
  "mesh-mint", "mesh-fresh", "mesh-ocean",
  "mesh-lavender", "mesh-rose", "mesh-sky",
];

function assignTextCover(post, idx) {
  const meshClass = meshClasses[(post.id * 7 + idx) % meshClasses.length];
  const ratios = ["ratio-4-3", "ratio-1-1", "ratio-3-4"];
  const ratioClass = ratios[(post.id * 3 + idx) % ratios.length];
  return { meshClass, ratioClass };
}

function coverHeight(post) {
  if (post.mediaType === "text") {
    const len = (post.title || "").length + (post.detail || "").length;
    if (len > 60) return 200; if (len > 30) return 170; return 140;
  }
  return 240; // 图片/视频/相册 统一高度
}

function splitWaterfall(posts) {
  const left = []; const right = [];
  let leftH = 0; let rightH = 0;
  posts.forEach((post) => {
    const h = coverHeight(post);
    if (leftH <= rightH) { left.push(post); leftH += h; }
    else { right.push(post); rightH += h; }
  });
  return { leftList: left, rightList: right };
}

function defaultDateTime(hours) {
  const value = new Date(Date.now() + hours * 60 * 60 * 1000);
  return {
    date: `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`,
    time: `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`,
  };
}

function defaultRecommendForm() {
  const start = defaultDateTime(24);
  const end = defaultDateTime(26);
  return {
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    categories: ["运动", "自习"]
  };
}

function buildRecommendCategories(selected) {
  return categories
    .filter((item) => item.name !== "全部")
    .map((item) => ({ ...item, selected: selected.includes(item.name) }));
}

Page({
  data: {
    categories,
    activeCategory: "全部",
    mode: "square",
    recommendForm: defaultRecommendForm(),
    recommendCategories: buildRecommendCategories(defaultRecommendForm().categories),
    leftList: [],
    rightList: [],
    loading: false,
    pageLeaving: true
  },
  onShow() {
    if (!requireLogin()) return;
    this.selectTab();
    this.setData({ pageLeaving: true }, () => {
      setTimeout(() => this.setData({ pageLeaving: false }), 60);
    });
    if (this.data.mode === "recommend") this.loadRecommendations();
    else this.loadPosts();
  },
  selectTab() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },
  async loadPosts() {
    this.setData({ loading: true });
    try {
      const url = this.data.activeCategory === "全部" ? "/posts" : `/posts?category=${this.data.activeCategory}`;
      const data = await request({ url });
      const posts = data.posts.map((post, idx) => {
        const color = (categories.find((item) => item.name === post.category) || categories[1]).color;
        const mediaType = post.mediaType || "text";
        const textCover = (mediaType === "text" && !post.coverImage)
          ? assignTextCover(post, idx) : null;
        const albumCount = (mediaType === "album" && Array.isArray(post.images))
          ? post.images.length : 0;
        return {
          ...post,
          color,
          mediaType,
          albumCount,
          timeText: `${formatDateTime(post.startTime)} - ${formatDateTime(post.endTime)}`,
          postedAtText: formatPostedAt(post.createdAt),
          meshClass: textCover ? textCover.meshClass : "",
          ratioClass: textCover ? textCover.ratioClass : "",
        };
      });
      const { leftList, rightList } = splitWaterfall(posts);
      this.setData({ leftList, rightList });
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  async loadRecommendations() {
    const form = this.data.recommendForm;
    if (!form.date || !form.startTime || !form.endTime) {
      wx.showToast({ title: "先选一个空闲时间", icon: "none" });
      return;
    }
    if (form.startTime >= form.endTime) {
      wx.showToast({ title: "结束时间要晚一点", icon: "none" });
      return;
    }
    this.setData({ loading: true });
    try {
      const params = [
        `date=${encodeURIComponent(form.date)}`,
        `startTime=${encodeURIComponent(form.startTime)}`,
        `endTime=${encodeURIComponent(form.endTime)}`,
        `categories=${encodeURIComponent(form.categories.join(","))}`
      ].join("&");
      const data = await request({ url: `/posts/recommended?${params}` });
      const posts = data.posts.map((post, idx) => {
        const color = (categories.find((item) => item.name === post.category) || categories[1]).color;
        const mediaType = post.mediaType || "text";
        const textCover = (mediaType === "text" && !post.coverImage)
          ? assignTextCover(post, idx) : null;
        const albumCount = (mediaType === "album" && Array.isArray(post.images))
          ? post.images.length : 0;
        return {
          ...post,
          color,
          mediaType,
          albumCount,
          timeText: `${formatDateTime(post.startTime)} - ${formatDateTime(post.endTime)}`,
          postedAtText: formatPostedAt(post.createdAt),
          meshClass: textCover ? textCover.meshClass : "",
          ratioClass: textCover ? textCover.ratioClass : "",
        };
      });
      const { leftList, rightList } = splitWaterfall(posts);
      this.setData({ leftList, rightList });
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  onPullDownRefresh() {
    const loader = this.data.mode === "recommend" ? this.loadRecommendations() : this.loadPosts();
    if (!loader || typeof loader.then !== "function") {
      wx.stopPullDownRefresh();
      return;
    }
    loader.then(() => setTimeout(() => wx.stopPullDownRefresh(), 350));
  },
  switchMode(event) {
    const mode = event.currentTarget.dataset.mode;
    if (mode === this.data.mode) return;
    this.setData({ mode, leftList: [], rightList: [] });
    if (mode === "recommend") this.loadRecommendations();
    else this.loadPosts();
  },
  switchCategory(event) {
    this.setData({ activeCategory: event.currentTarget.dataset.category });
    this.loadPosts();
  },
  onRecommendDateChange(event) {
    this.setData({ "recommendForm.date": event.detail.value });
  },
  onRecommendTimeChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`recommendForm.${key}`]: event.detail.value });
  },
  toggleRecommendCategory(event) {
    const name = event.currentTarget.dataset.name;
    const form = this.data.recommendForm;
    let next = form.categories.slice();
    const index = next.indexOf(name);
    if (index >= 0) next.splice(index, 1);
    else next.push(name);
    if (next.length === 0) {
      wx.showToast({ title: "至少选一种活动", icon: "none" });
      next = form.categories;
    }
    this.setData({
      "recommendForm.categories": next,
      recommendCategories: buildRecommendCategories(next)
    });
  },
  goDetail(event) {
    wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${event.currentTarget.dataset.id}` });
  },
  goUser(event) {
    wx.navigateTo({ url: `/pages/user-home/user-home?id=${event.currentTarget.dataset.id}` });
  }
});
