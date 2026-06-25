const { request } = require("../../utils/request");
const { saveSession } = require("../../utils/session");

Page({
  data: {
    phoneNumber: "",
    nickname: "",
    loggingIn: false,
    registering: false
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [key]: event.detail.value });
  },
  normalizePhone() {
    return String(this.data.phoneNumber || "").replace(/\s|-/g, "");
  },
  async loginWithPhone() {
    if (this.data.loggingIn) return;
    const phoneNumber = this.normalizePhone();
    if (!phoneNumber) {
      wx.showToast({ title: "先填手机号", icon: "none" });
      return;
    }
    this.setData({ loggingIn: true });
    try {
      const data = await request({
        url: "/auth/wechat-login",
        method: "POST",
        data: { phoneNumber }
      });
      this.enterApp(data);
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ loggingIn: false });
    }
  },
  async register() {
    if (this.data.registering) return;
    const phoneNumber = this.normalizePhone();
    if (!phoneNumber) {
      wx.showToast({ title: "先填手机号", icon: "none" });
      return;
    }
    this.setData({ registering: true });
    try {
      const data = await request({
        url: "/auth/wechat-register",
        method: "POST",
        data: {
          phoneNumber,
          nickname: this.data.nickname.trim() || undefined
        }
      });
      this.enterApp(data);
    } catch (error) {
      console.error(error);
    } finally {
      this.setData({ registering: false });
    }
  },
  enterApp(data) {
    saveSession(data.token, data.user);
    if (data.user.onboardingCompleted) {
      wx.switchTab({ url: "/pages/square/square" });
    } else {
      wx.redirectTo({ url: "/pages/onboarding/onboarding" });
    }
  }
});
