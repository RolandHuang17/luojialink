const { request } = require("../utils/request");

function readKeys() {
  const userId = getApp().globalData.user && getApp().globalData.user.id;
  return wx.getStorageSync(`messageReadKeys:${userId || "guest"}`) || {};
}

function baselineAt() {
  const userId = getApp().globalData.user && getApp().globalData.user.id;
  const key = `messageReadBaselineAtV3:${userId || "guest"}`;
  let value = wx.getStorageSync(key);
  if (!value) {
    value = Date.now();
    wx.setStorageSync(key, value);
  }
  return Number(value);
}

function itemKey(item) {
  if (item.type === "application") {
    return `application:${item.id}:${item.updatedAt || item.createdAt}`;
  }
  const marker = item.lastMessage ? item.lastMessage.id || item.lastMessage.createdAt : item.updatedAt || item.createdAt;
  return `session:${item.id}:${marker}`;
}

function itemTime(item) {
  const marker =
    item.type === "session" && item.lastMessage
      ? item.lastMessage.createdAt
      : item.updatedAt || item.createdAt;
  const time = new Date(marker).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isUnread(item, currentUserId, readMap) {
  const key = itemKey(item);
  const hasSignal =
    (item.type === "application" && item.isPublisher) ||
    (item.type === "session" &&
      ((item.lastMessage && item.lastMessage.senderId !== currentUserId) || !item.lastMessage));
  return hasSignal && itemTime(item) > baselineAt() && !readMap[key];
}

function ensureReadBaseline(items) {
  const userId = getApp().globalData.user && getApp().globalData.user.id;
  const initKey = `messageReadInitializedV3:${userId || "guest"}`;
  if (wx.getStorageSync(initKey)) return readKeys();
  const readMap = readKeys();
  items.forEach((item) => {
    readMap[itemKey(item)] = true;
  });
  wx.setStorageSync(`messageReadKeys:${userId || "guest"}`, readMap);
  wx.setStorageSync(initKey, true);
  baselineAt();
  return readMap;
}

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
        const currentUserId = app.globalData.user && app.globalData.user.id;
        const readMap = ensureReadBaseline(items);
        const hasUnread = items.some((item) => isUnread(item, currentUserId, readMap));
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
