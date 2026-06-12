const { requireLogin } = require("../../utils/session");

Page({
  onLoad() {
    requireLogin();
  }
});
