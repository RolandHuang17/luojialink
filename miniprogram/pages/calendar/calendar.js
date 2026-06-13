const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

function todayText() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isTimeBefore(startTime, endTime) {
  return startTime < endTime;
}

Page({
  data: {
    slots: [],
    statusOptions: [
      { label: "空闲", value: "available" },
      { label: "忙碌", value: "busy" }
    ],
    statusIndex: 0,
    form: {
      date: todayText(),
      startTime: "18:00",
      endTime: "20:00",
      status: "available"
    },
    loading: false,
    saving: false
  },
  onShow() {
    if (!requireLogin()) return;
    this.loadSlots();
  },
  async loadSlots() {
    this.setData({ loading: true });
    try {
      const data = await request({ url: "/calendar/slots" });
      this.setData({ slots: data.slots });
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ loading: false });
    }
  },
  onDateChange(event) {
    this.setData({ "form.date": event.detail.value });
  },
  onStartChange(event) {
    this.setData({ "form.startTime": event.detail.value });
  },
  onEndChange(event) {
    this.setData({ "form.endTime": event.detail.value });
  },
  onStatusChange(event) {
    const statusIndex = Number(event.detail.value);
    this.setData({
      statusIndex,
      "form.status": this.data.statusOptions[statusIndex].value
    });
  },
  addSlot() {
    const slot = { ...this.data.form, tempId: `local-${Date.now()}` };
    if (!isTimeBefore(slot.startTime, slot.endTime)) {
      wx.showToast({ title: "结束时间需晚于开始时间", icon: "none" });
      return;
    }
    const slots = [...this.data.slots, slot].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
    this.setData({ slots });
  },
  removeSlot(event) {
    const index = Number(event.currentTarget.dataset.index);
    const slots = this.data.slots.filter((_slot, slotIndex) => slotIndex !== index);
    this.setData({ slots });
  },
  async saveSlots() {
    this.setData({ saving: true });
    try {
      const data = await request({
        url: "/calendar/slots",
        method: "PUT",
        data: {
          slots: this.data.slots.map((slot) => ({
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: slot.status
          }))
        }
      });
      this.setData({ slots: data.slots });
      wx.showToast({ title: "已保存" });
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ saving: false });
    }
  }
});
