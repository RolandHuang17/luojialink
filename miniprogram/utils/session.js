function saveSession(token, user) {
  const app = getApp();
  app.globalData.token = token;
  app.globalData.user = user;
  wx.setStorageSync("token", token);
  wx.setStorageSync("user", user);
}

function clearSession() {
  const app = getApp();
  app.globalData.token = "";
  app.globalData.user = null;
  wx.removeStorageSync("token");
  wx.removeStorageSync("user");
}

function requireLogin() {
  const app = getApp();
  if (!app.globalData.token) {
    wx.reLaunch({ url: "/pages/login/login" });
    return false;
  }
  return true;
}

module.exports = { saveSession, clearSession, requireLogin };
