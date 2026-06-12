const { requireLogin } = require("../../utils/session");

Page({
  onShow() {
    requireLogin();
  }
});
