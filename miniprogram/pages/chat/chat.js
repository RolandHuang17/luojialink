const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");
const { messageListStatus, messageListStatusTone } = require("../../utils/copy");

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
  const hasSignal =
    (item.type === "application" && item.isPublisher) ||
    (item.type === "session" &&
      ((item.lastMessage && item.lastMessage.senderId !== currentUserId) || !item.lastMessage));
  return hasSignal && itemTime(item) > baselineAt() && !readMap[itemKey(item)];
}

function markRead(item) {
  const userId = getApp().globalData.user && getApp().globalData.user.id;
  const readMap = readKeys();
  readMap[itemKey(item)] = true;
  wx.setStorageSync(`messageReadKeys:${userId || "guest"}`, readMap);
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
      const currentUserId = getApp().globalData.user && getApp().globalData.user.id;
      const rawItems = data.items || data.sessions || [];
      const readMap = ensureReadBaseline(rawItems);
      const items = rawItems.map((item) => {
        const hasUnread = isUnread(item, currentUserId, readMap);
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
    const item = this.data.items.find((entry) => String(entry.id) === String(id) && entry.type === type);
    if (item) markRead(item);
    wx.navigateTo({ url: `/pages/chat-room/chat-room?type=${type}&id=${id}` });
  }
});
