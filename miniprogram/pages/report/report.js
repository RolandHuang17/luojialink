const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

const targetTypes = [
  { label: "请求", value: "post" },
  { label: "会话", value: "session" },
  { label: "消息", value: "message" },
  { label: "用户", value: "user" },
  { label: "AI建议", value: "ai" }
];

const reasons = ["骚扰或不友善", "虚假信息", "安全风险", "垃圾内容", "其他"];

Page({
  data: {
    targetTypes,
    targetTypeLabels: targetTypes.map((item) => item.label),
    targetTypeIndex: 0,
    reasons,
    reasonIndex: 0,
    targetId: "",
    detail: "",
    submitting: false
  },
  onLoad(query) {
    if (!requireLogin()) return;
    const targetTypeIndex = Math.max(
      0,
      targetTypes.findIndex((item) => item.value === query.targetType)
    );
    this.setData({
      targetTypeIndex,
      targetId: query.targetId || ""
    });
  },
  onTypeChange(event) {
    this.setData({ targetTypeIndex: Number(event.detail.value) });
  },
  onReasonChange(event) {
    this.setData({ reasonIndex: Number(event.detail.value) });
  },
  onTargetIdInput(event) {
    this.setData({ targetId: event.detail.value });
  },
  onDetailInput(event) {
    this.setData({ detail: event.detail.value });
  },
  async submitReport() {
    const targetId = Number(this.data.targetId);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      wx.showToast({ title: "请输入有效目标 ID", icon: "none" });
      return;
    }
    if (this.data.submitting) return;

    this.setData({ submitting: true });
    try {
      await request({
        url: "/reports",
        method: "POST",
        data: {
          targetType: targetTypes[this.data.targetTypeIndex].value,
          targetId,
          reason: reasons[this.data.reasonIndex],
          detail: this.data.detail.trim()
        }
      });
      wx.showToast({ title: "举报已提交" });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ submitting: false });
    }
  }
});
