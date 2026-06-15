const { humanizeMessage, notifyRequestError } = require("./errors");

function uploadAvatarFile(tempFilePath) {
  const app = getApp();
  return new Promise((resolve, reject) => {
    if (!tempFilePath) {
      reject(new Error("未选择图片"));
      return;
    }

    wx.uploadFile({
      url: `${app.globalData.apiBaseUrl}/uploads/avatar`,
      filePath: tempFilePath,
      name: "file",
      header: app.globalData.token ? { Authorization: `Bearer ${app.globalData.token}` } : {},
      success(uploadRes) {
        let payload = {};
        try {
          payload = JSON.parse(uploadRes.data || "{}");
        } catch (error) {
          notifyRequestError({ message: "头像上传失败" }, uploadRes.statusCode);
          reject(error);
          return;
        }

        if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300 && payload.code === 0 && payload.data && payload.data.url) {
          resolve(payload.data.url);
          return;
        }

        notifyRequestError(payload, uploadRes.statusCode);
        reject(payload);
      },
      fail(err) {
        notifyRequestError({ message: "头像上传失败" }, 0);
        reject(err);
      }
    });
  });
}

function chooseAndUploadAvatar() {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      sizeType: ["compressed"],
      success(chooseRes) {
        const file = chooseRes.tempFiles[0];
        uploadAvatarFile(file && file.tempFilePath).then(resolve).catch(reject);
      },
      fail(err) {
        if (err && err.errMsg && err.errMsg.includes("cancel")) {
          reject(err);
          return;
        }
        notifyRequestError({ message: "无法打开相册或相机" }, 0);
        reject(err);
      }
    });
  });
}

function syncWeChatAvatar(detail) {
  if (!detail || !detail.avatarUrl) {
    return Promise.reject(new Error("未获取微信头像"));
  }
  return uploadAvatarFile(detail.avatarUrl);
}

async function withAvatarUpload(page, uploadFn, applyUrl) {
  if (page.data.uploadingAvatar) return;
  page.setData({ uploadingAvatar: true });
  try {
    const url = await uploadFn();
    applyUrl(url);
  } catch (error) {
    if (error && error.errMsg && error.errMsg.includes("cancel")) {
      return;
    }
    const message = humanizeMessage((error && error.message) || (error && error.msg) || "头像上传失败");
    wx.showToast({ title: message, icon: "none" });
    console.error(error);
  } finally {
    page.setData({ uploadingAvatar: false });
  }
}

module.exports = {
  chooseAndUploadAvatar,
  syncWeChatAvatar,
  withAvatarUpload
};
