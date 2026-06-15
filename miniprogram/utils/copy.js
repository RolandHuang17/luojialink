const POST_STATUS = {
  published: "招募中",
  matched: "已搭上",
  draft: "草稿",
  cancelled: "已取消"
};

const SECTION_LABELS = {
  basic: "先认识一下你",
  about: "再聊聊你自己"
};

function postStatusLabel(status) {
  return POST_STATUS[status] || status;
}

function messageListStatus(item, hasUnread) {
  if (item.type === "application") {
    return item.isPublisher ? "待你确认" : "等待对方";
  }
  if (item.type === "session") {
    if (item.status === "closed") return "已取消";
    if (hasUnread) return "有新消息";
    return "可以开聊啦";
  }
  return "";
}

function calendarEventType(type) {
  const map = {
    published: "我发起的",
    applied: "我申请的",
    matched: "已搭上"
  };
  return map[type] || type;
}

function messageListStatusTone(item, hasUnread) {
  if (item.type === "application") {
    return item.isPublisher ? "pending" : "waiting";
  }
  if (item.type === "session" && item.status === "closed") {
    return "waiting";
  }
  if (hasUnread) return "unread";
  return "chat";
}

module.exports = {
  POST_STATUS,
  SECTION_LABELS,
  postStatusLabel,
  messageListStatus,
  messageListStatusTone,
  calendarEventType
};
