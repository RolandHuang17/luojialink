const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");
const { formatDateTime } = require("../../utils/format");

const typeTextMap = {
  published: "我发布的",
  applied: "我申请的",
  matched: "已搭上"
};

function dateKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

Page({
  data: {
    days: [],
    events: [],
    selectedDate: "",
    selectedEvents: []
  },
  onShow() {
    if (!requireLogin()) return;
    this.buildDays();
    this.loadEvents();
  },
  buildDays() {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 14; i += 1) {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      days.push({
        key: dateKey(date),
        day: date.getDate(),
        week: ["日", "一", "二", "三", "四", "五", "六"][date.getDay()]
      });
    }
    this.setData({ days, selectedDate: days[0].key });
  },
  async loadEvents() {
    const data = await request({ url: "/calendar/events" });
    const events = data.events.map((event) => ({
      ...event,
      date: dateKey(event.startTime),
      typeText: typeTextMap[event.type] || event.type,
      timeText: `${formatDateTime(event.startTime)} - ${formatDateTime(event.endTime)}`
    }));
    this.setData({ events });
    this.filterEvents();
  },
  selectDate(event) {
    this.setData({ selectedDate: event.currentTarget.dataset.date });
    this.filterEvents();
  },
  filterEvents() {
    this.setData({
      selectedEvents: this.data.events.filter((event) => event.date === this.data.selectedDate)
    });
  },
  goDetail(event) {
    wx.navigateTo({ url: `/pages/post-detail/post-detail?id=${event.currentTarget.dataset.id}` });
  }
});
