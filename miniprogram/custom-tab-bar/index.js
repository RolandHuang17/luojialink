const { request } = require("../utils/request");

Component({
  data: {
    selected: 0,
    list: [
      { pagePath: "/pages/square/square", text: "广场", iconKey: "square" },
      { pagePath: "/pages/calendar/calendar", text: "日程", iconKey: "calendar" },
      { pagePath: "/pages/publish/publish", text: "发布", iconKey: "publish", isPublish: true },
      { pagePath: "/pages/chat/chat", text: "消息", iconKey: "chat" },
      { pagePath: "/pages/profile/profile", text: "我的", iconKey: "profile" }
    ]
  },
  lifetimes: {
    attached() {
      this.refreshBadge();
    }
  },
  pageLifetimes: {
    show() {
      this.refreshBadge();
    }
  },
  methods: {
    switchTab(event) {
      const index = Number(event.currentTarget.dataset.index);
      const path = event.currentTarget.dataset.path;
      this.setData({ selected: index });
      wx.switchTab({ url: path });
    },
    async refreshBadge() {
      const app = getApp();
      if (!app.globalData || !app.globalData.token) return;
      try {
        const data = await request({ url: "/sessions" });
        const items = data.items || data.sessions || [];
        const hasUnread = items.some((item) => Boolean(item.hasUnread));
        const list = this.data.list.map((item) => ({
          ...item,
          badge: item.pagePath === "/pages/chat/chat" ? hasUnread : false
        }));
        this.setData({ list });
      } catch (error) {
        console.error(error);
      }
    }
  }
});
