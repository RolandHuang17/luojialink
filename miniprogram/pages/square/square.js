const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");
const { formatDateTime } = require("../../utils/format");

const categories = [
  { name: "全部", color: "all" },
  { name: "吃饭", color: "food" },
  { name: "运动", color: "sport" },
  { name: "自习", color: "study" },
  { name: "娱乐", color: "fun" }
];

Page({
  data: {
    categories,
    activeCategory: "全部",
    posts: [],
    loading: false
  },
  onShow() {
    if (!requireLogin()) return;
    this.selectTab();
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
      this.setData({
        posts: data.posts.map((post) => ({
          ...post,
          color: (categories.find((item) => item.name === post.category) || categories[0]).color,
          timeText: `${formatDateTime(post.startTime)} - ${formatDateTime(post.endTime)}`
        }))
      });
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ loading: false });
    }
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
