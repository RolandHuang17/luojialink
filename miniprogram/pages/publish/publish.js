const { request } = require("../../utils/request");
const { requireLogin } = require("../../utils/session");

Page({
  data: {
    form: {
      category: "约饭",
      locationPref: "工学部附近",
      feePref: "AA，预算 30-50",
      description: "想找一位同学一起吃晚饭，可以边吃边聊课程项目。"
    }
  },
  onLoad() {
    requireLogin();
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },
  async submit() {
    const start = new Date();
    start.setHours(18, 30, 0, 0);
    const end = new Date(start);
    end.setHours(20, 0, 0, 0);
    const expire = new Date(start);
    expire.setMinutes(expire.getMinutes() - 30);
    if (expire <= new Date()) {
      start.setDate(start.getDate() + 1);
      end.setDate(end.getDate() + 1);
      expire.setDate(expire.getDate() + 1);
    }

    try {
      await request({
        url: "/posts",
        method: "POST",
        data: {
          ...this.data.form,
          anonymousFlag: true,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          expireTime: expire.toISOString()
        }
      });
      wx.showToast({ title: "发布成功" });
      wx.navigateBack();
    } catch (error) {
      console.error(error);
    }
  }
});
