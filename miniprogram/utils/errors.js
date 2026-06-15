const FRIENDLY_MESSAGES = {
  "发布参数错误": "请检查标题、具体规划和活动地点是否填写完整",
  "草稿参数错误": "草稿内容不完整，请补全后再保存",
  "想搭参数错误": "内容有误，请检查后重试",
  "申请参数错误": "申请没能发出去，请稍后再试",
  "注册资料不完整或存在非法选项": "还有必填项没填好，请检查一下",
  "资料参数错误": "资料填写有误，请检查后重试",
  "消息参数错误": "消息发送失败，请换一句试试",
  "登录参数错误": "请选择一个账号登录",
  "请选择一张图片": "请先选一张头像图片",
  "只支持图片文件": "只能上传图片格式的头像",
  "图片太大了，请换一张": "图片太大了，请换一张",
  "头像上传失败": "头像上传失败了，请稍后再试",
  "未获取微信头像": "没能读取微信头像，请再试一次",
  "举报参数错误": "举报信息不完整，请补充后再提交",
  "时间片参数错误": "时间段填写有误，请重新选择",
  "分类参数错误": "分类选择有误",
  "不能申请自己发布的想搭": "这是你自己发起的，不能申请哦",
  "该想搭已经不可申请": "这条想搭已经过期或满员了",
  "你已申请过该想搭": "你已经申请过啦，去消息里看看进度",
  "会话已关闭，不能继续发送消息": "这次聊天已结束，不能再发消息了",
  "申请通过前不能自由聊天": "对方还没确认，暂时不能闲聊",
  "只有成功搭上后才能互换联系方式": "确认同行后才能互换联系方式",
  "只有待处理申请可以撤回": "这条申请已经处理过了",
  "该申请已处理": "这条申请已经处理过了",
  "无权处理该申请": "这条申请不需要你来处理",
  "只能删除草稿": "只能删除草稿哦",
  "已搭上的活动不能取消": "已经搭上的活动不能取消",
  "请填写取消理由": "请先填写取消理由",
  "这次约好已经取消": "这次约好已经取消啦",
  "只有已搭上的会话可以取消": "只有已搭上的会话可以取消",
  "未登录或 Token 缺失": "请先登录",
  "Token 无效": "登录已过期，请重新登录",
  "请求失败": "操作失败了，请稍后再试",
  "后端服务未连接": "连不上服务器，请先启动后端"
};

function humanizeMessage(message) {
  if (!message) return FRIENDLY_MESSAGES["请求失败"];
  if (message.includes("时间冲突")) return message;
  if (message.includes("同时有效想搭不能超过")) {
    return message.replace("同时有效想搭不能超过", "最多只能同时发布").replace("个", "条想搭哦");
  }
  if (message.includes("未来 14 天")) return "活动时间需要在今后两周内";
  if (FRIENDLY_MESSAGES[message]) return FRIENDLY_MESSAGES[message];
  if (message.includes("参数错误")) return "填写内容有误，请检查后重试";
  return message;
}

function notifyRequestError(payload, statusCode) {
  const message = humanizeMessage(payload && payload.message);
  const isConflict = statusCode === 409 || message.includes("时间冲突");

  if (isConflict) {
    wx.showModal({
      title: "时间冲突",
      content: message.includes("时间冲突") ? message : `${message}，请调整时间后再试。`,
      showCancel: false,
      confirmText: "知道了"
    });
    return;
  }

  if (message.length > 14) {
    wx.showModal({
      title: "提示",
      content: message,
      showCancel: false,
      confirmText: "知道了"
    });
    return;
  }

  wx.showToast({ title: message, icon: "none" });
}

module.exports = { humanizeMessage, notifyRequestError };
