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

Page({
  data: {
    categories,
    activeCategory: "全部",
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
    this.loadPosts();
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
  onPullDownRefresh() {
    this.loadPosts().then(() => setTimeout(() => wx.stopPullDownRefresh(), 350));
  },
  switchCategory(event) {
    this.setData({ activeCategory: event.currentTarget.dataset.category });
    this.loadPosts();
  },
  goDetail(event) {
    wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${event.currentTarget.dataset.id}` });
  },
  goUser(event) {
    wx.navigateTo({ url: `/pages/user-home/user-home?id=${event.currentTarget.dataset.id}` });
  }
});
