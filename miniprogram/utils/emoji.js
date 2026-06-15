const EMOJI_BASE = "https://res.wx.qq.com/mpres/htmledition/images/icon/emotion";

const EMOJI_NAMES = [
  "微笑", "撇嘴", "色", "发呆", "得意", "流泪", "害羞", "闭嘴", "睡", "大哭",
  "尴尬", "发怒", "调皮", "呲牙", "惊讶", "难过", "酷", "冷汗", "抓狂", "吐",
  "偷笑", "可爱", "白眼", "傲慢", "饥饿", "困", "惊恐", "流汗", "憨笑", "大兵",
  "奋斗", "咒骂", "疑问", "嘘", "晕", "折磨", "衰", "骷髅", "敲打", "再见",
  "擦汗", "抠鼻", "鼓掌", "糗大了", "坏笑", "左哼哼", "右哼哼", "哈欠", "鄙视", "委屈",
  "快哭了", "阴险", "亲亲", "吓", "可怜", "菜刀", "西瓜", "啤酒", "篮球", "乒乓",
  "咖啡", "饭", "猪头", "玫瑰", "凋谢", "示爱", "爱心", "心碎", "蛋糕", "闪电",
  "炸弹", "刀", "足球", "瓢虫", "便便", "月亮", "太阳", "礼物", "拥抱", "强",
  "弱", "握手", "胜利", "抱拳", "勾引", "拳头", "差劲", "爱你", "NO", "OK",
  "爱情", "飞吻", "跳跳", "发抖", "怄火", "转圈", "磕头", "回头", "跳绳", "挥手",
  "激动", "街舞", "献吻", "左太极", "右太极"
];

const EMOJI_LIST = EMOJI_NAMES.map((name, index) => ({
  key: `[${name}]`,
  name,
  index,
  src: `${EMOJI_BASE}/${index}.gif`
}));

const EMOJI_MAP = EMOJI_LIST.reduce((map, item) => {
  map[item.key] = item;
  return map;
}, {});

const EMOJI_PATTERN = EMOJI_LIST.map((item) => item.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

function parseMessageContent(text) {
  const content = String(text || "");
  if (!content) return [{ type: "text", content: "" }];
  if (!EMOJI_PATTERN) return [{ type: "text", content }];

  const segments = [];
  const re = new RegExp(`(${EMOJI_PATTERN})`, "g");
  const parts = content.split(re);

  parts.forEach((part) => {
    if (!part) return;
    const emoji = EMOJI_MAP[part];
    if (emoji) {
      segments.push({ type: "emoji", content: part, src: emoji.src, name: emoji.name });
      return;
    }
    segments.push({ type: "text", content: part });
  });

  return segments.length ? segments : [{ type: "text", content }];
}

function decorateMessages(messages) {
  return (messages || []).map((message) => ({
    ...message,
    segments: parseMessageContent(message.content)
  }));
}

function getEmojiPanel() {
  return EMOJI_LIST;
}

module.exports = {
  EMOJI_LIST,
  parseMessageContent,
  decorateMessages,
  getEmojiPanel
};
