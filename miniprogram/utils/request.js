const { notifyRequestError } = require("./errors");

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
          if (options.silent !== true) {
            notifyRequestError(res.data, res.statusCode);
          }
          reject(res.data);
        }
      },
      fail(err) {
        if (options.silent !== true) {
          notifyRequestError({ message: "后端服务未连接" }, 0);
        }
        reject(err);
      }
    });
  });
}

module.exports = { request };
