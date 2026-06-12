function request(options) {
  const app = getApp();
  const header = Object.assign({}, options.header || {});
  if (app.globalData.token) {
    header.Authorization = `Bearer ${app.globalData.token}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}${options.url}`,
      method: options.method || "GET",
      data: options.data || {},
      header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data.code === 0) {
          resolve(res.data.data);
        } else {
          const message = res.data && res.data.message ? res.data.message : "请求失败";
          wx.showToast({ title: message, icon: "none" });
          reject(res.data);
        }
      },
      fail(err) {
        wx.showToast({ title: "后端服务未连接", icon: "none" });
        reject(err);
      }
    });
  });
}

module.exports = { request };
