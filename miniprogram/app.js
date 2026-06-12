App({
  globalData: {
    apiBaseUrl: "http://127.0.0.1:3000/api",
    token: "",
    user: null
  },
  onLaunch() {
    const token = wx.getStorageSync("token");
    const user = wx.getStorageSync("user");
    if (token) this.globalData.token = token;
    if (user) this.globalData.user = user;
  }
});
