const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");
const { messageListStatus, messageListStatusTone } = require("../../utils/copy");

Page({
  data: {
    items: [],
    loading: false,
    pageLeaving: true
  },
  onShow() {
    if (!requireLogin()) return;
    this.selectTab();
    this.setData({ pageLeaving: true }, () => {
      setTimeout(() => this.setData({ pageLeaving: false }), 60);
    });
    this.loadItems();
  },
  selectTab() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },
  async loadItems() {
    this.setData({ loading: true });
    try {
      const data = await request({ url: "/sessions" });
      const rawItems = data.items || data.sessions || [];
      const items = rawItems.map((item) => {
        const hasUnread = Boolean(item.hasUnread);
        return {
          ...item,
          statusText: messageListStatus(item, hasUnread),
          statusTone: messageListStatusTone(item, hasUnread),
          hasUnread
        };
      });
      this.setData({ items });
      if (typeof this.getTabBar === "function" && this.getTabBar()) {
        this.getTabBar().refreshBadge();
      }
    } finally {
      this.setData({ loading: false });
    }
  },
  onPullDownRefresh() {
    this.loadItems().then(() => setTimeout(() => wx.stopPullDownRefresh(), 350));
  },
  openItem(event) {
    const id = event.currentTarget.dataset.id;
    const type = event.currentTarget.dataset.type;
    wx.navigateTo({ url: `/pages/chat-room/chat-room?type=${type}&id=${id}` });
  }
});
