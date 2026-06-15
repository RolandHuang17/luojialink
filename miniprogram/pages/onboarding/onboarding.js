const { request } = require("../../utils/request");
const { saveSession, requireLogin } = require("../../utils/session");
const { SECTION_LABELS } = require("../../utils/copy");
const { chooseAndUploadAvatar, syncWeChatAvatar, withAvatarUpload } = require("../../utils/avatar");

function buildMbtiPreview(mbti) {
  return mbti.map((char) => char || "?").join("");
}

const steps = [
  { key: "college", section: "basic", title: "你在哪个学院？", hint: "同院或隔壁院的同学，往往更容易聊得来", type: "select", optionKey: "colleges" },
  { key: "grade", section: "basic", title: "你现在读几年级？", hint: "方便找到节奏相近的搭子", type: "wheel", optionKey: "grades" },
  { key: "age", section: "basic", title: "你今年多大？", hint: "只用于匹配参考，不会公开给所有人", type: "wheel", optionKey: "ages" },
  { key: "nickname", section: "basic", title: "大家怎么称呼你？", hint: "取一个你平时最常用的名字就好", type: "input", placeholder: "例如：知夏、阿泽" },
  { key: "avatarUrl", section: "basic", title: "选一张头像", hint: "可一键同步微信头像，或从相册选图", type: "avatar" },
  { key: "gender", section: "basic", title: "你的性别是？", hint: "仅用于匹配展示", type: "select", optionKey: "genders" },
  { key: "hometown", section: "basic", title: "你的家乡在哪？", hint: "说不定能遇到老乡", type: "select", optionKey: "hometowns" },
  { key: "wechatId", section: "basic", title: "你的微信号是？", hint: "默认不会公开，只有双方确认同行并互换后才可见", type: "input", placeholder: "例如：whu_xiaoming" },
  { key: "campus", section: "about", title: "你平时常在哪个学部？", hint: "约活动时会优先参考你的常驻区域", type: "select", optionKey: "campuses" },
  { key: "mbti0", section: "about", title: "周末更想怎么恢复精力？", hint: "没有标准答案，选最像你的就好", type: "mbti", mbtiIndex: 0, options: [{ label: "约朋友聊聊天、出去走走", value: "E" }, { label: "自己待着充电、做喜欢的事", value: "I" }] },
  { key: "mbti1", section: "about", title: "你更常注意到什么？", hint: "这会影响你和人相处时的关注点", type: "mbti", mbtiIndex: 1, options: [{ label: "眼前具体的事和细节", value: "S" }, { label: "背后的可能性和灵感", value: "N" }] },
  { key: "mbti2", section: "about", title: "做决定时你更依赖？", hint: "了解你的相处风格，方便找到合拍的人", type: "mbti", mbtiIndex: 2, options: [{ label: "逻辑和原则", value: "T" }, { label: "感受和彼此的关系", value: "F" }] },
  { key: "mbti3", section: "about", title: "安排事情时你更喜欢？", hint: "最后一题啦，马上完成", type: "mbti", mbtiIndex: 3, options: [{ label: "提前计划，心里有数", value: "J" }, { label: "留点弹性，随机应变", value: "P" }] },
  { key: "relationExpectation", section: "about", title: "你更期待哪种关系？", hint: "可以只是搭子，也可以慢慢成为朋友", type: "select", optionKey: "relationExpectations" },
  { key: "bio", section: "about", title: "用一句话介绍你自己", hint: "像跟朋友自我介绍那样就好", type: "textarea", placeholder: "例如：爱散步的工学部夜猫子，找饭搭子也找聊得来的朋友" },
  { key: "hobbies", section: "about", title: "你的爱好有哪些？", hint: "写几个最常做的就行", type: "textarea", placeholder: "例如：羽毛球、看电影、泡图书馆" },
  { key: "favoriteThings", section: "about", title: "最喜欢的三件事", hint: "可以是小事，越具体越有画面感", type: "textarea", placeholder: "例如：晚风、热干面、把计划完成的那一刻" },
  { key: "messageToPeer", section: "about", title: "想对未来的搭子说", hint: "对方第一次认识你时会看到", type: "textarea", placeholder: "例如：希望我们都轻松一点，从一顿饭开始熟悉" },
  { key: "dealBreakers", section: "about", title: "你的雷点是什么？", hint: "提前说清楚，减少后续误会", type: "textarea", placeholder: "例如：临时爽约、不尊重个人边界" },
  { key: "personalTraits", section: "about", title: "选 3 个最像你的特质", hint: "帮助系统帮你找到同频的人", type: "traits" }
];

Page({
  data: {
    steps,
    index: 0,
    currentStep: steps[0],
    currentOptions: [],
    currentValue: "",
    currentPlaceholder: steps[0].placeholder || "",
    currentHint: steps[0].hint || "",
    sectionLabel: SECTION_LABELS[steps[0].section],
    wheelValue: [0],
    touched: {},
    canNext: false,
    isLastStep: false,
    options: {},
    mbti: ["", "", "", ""],
    mbtiPreview: "????",
    form: {
      college: "",
      grade: "",
      age: null,
      nickname: "",
      avatarUrl: "https://dummyimage.com/160x160/1d6f5f/ffffff&text=Me",
      gender: "",
      hometown: "",
      wechatId: "",
      campus: "",
      relationExpectation: "",
      bio: "",
      hobbies: "",
      favoriteThings: "",
      messageToPeer: "",
      dealBreakers: "",
      personalTraits: []
    },
    finished: false,
    submitting: false,
    uploadingAvatar: false
  },
  onLoad() {
    if (!requireLogin()) return;
    this.loadOptions();
  },
  async loadOptions() {
    const [data, profile] = await Promise.all([
      request({ url: "/users/options" }),
      request({ url: "/users/me/profile" })
    ]);
    const existing = profile.user || {};
    const form = this.data.form;
    const shouldPrefillChoices = Boolean(existing.onboardingCompleted);
    const nextForm = {
      ...form,
      college: shouldPrefillChoices ? existing.college || "" : "",
      grade: shouldPrefillChoices ? existing.grade || "" : "",
      age: shouldPrefillChoices ? existing.age || null : null,
      nickname: existing.nickname || "新同学",
      avatarUrl: existing.avatarUrl || form.avatarUrl,
      gender: shouldPrefillChoices ? existing.gender || "" : "",
      hometown: shouldPrefillChoices ? existing.hometown || "" : "",
      wechatId: existing.wechatId || "newbie_whu",
      campus: shouldPrefillChoices ? existing.campus || "" : "",
      relationExpectation: shouldPrefillChoices ? existing.relationExpectation || "" : "",
      bio: existing.bio && existing.bio !== "待填写" ? existing.bio : "想从一个轻松的小计划开始认识新朋友。",
      hobbies: existing.hobbies && existing.hobbies !== "待填写" ? existing.hobbies : "电影、散步、自习",
      favoriteThings: existing.favoriteThings && existing.favoriteThings !== "待填写" ? existing.favoriteThings : "晚风、咖啡、完成计划的瞬间",
      messageToPeer: existing.messageToPeer && existing.messageToPeer !== "待填写" ? existing.messageToPeer : "希望我们都轻松一点，慢慢熟悉。",
      dealBreakers: existing.dealBreakers && existing.dealBreakers !== "待填写" ? existing.dealBreakers : "临时爽约、不尊重边界",
      personalTraits: shouldPrefillChoices && existing.personalTraits && existing.personalTraits.length === 3 ? existing.personalTraits : []
    };
    const mbti = shouldPrefillChoices && existing.mbti && existing.mbti.length === 4 ? existing.mbti.split("") : ["", "", "", ""];
    this.setData({ options: data, form: nextForm, mbti });
    this.refreshStep();
  },
  refreshStep() {
    const step = steps[this.data.index];
    let currentOptions = [];
    let currentValue = this.data.form[step.key] || "";
    if (step.type === "select") {
      currentOptions = (this.data.options[step.optionKey] || []).map((value) => ({
        label: String(value),
        value,
        selected: String(this.data.form[step.key]) === String(value)
      }));
    } else if (step.type === "mbti") {
      currentValue = this.data.mbti[step.mbtiIndex];
      currentOptions = step.options.map((option) => ({
        ...option,
        selected: Boolean(currentValue) && option.value === currentValue
      }));
    } else if (step.type === "traits") {
      currentOptions = (this.data.options.personalTraits || []).map((value) => ({
        label: value,
        value,
        selected: this.data.form.personalTraits.indexOf(value) >= 0
      }));
    } else if (step.type === "wheel") {
      currentOptions = (this.data.options[step.optionKey] || []).map((value) => ({
        label: String(value),
        value
      }));
      const rawIndex = currentOptions.findIndex((option) => String(option.value) === String(this.data.form[step.key]));
      const selectedIndex = Math.max(0, rawIndex);
      currentValue = currentOptions[selectedIndex] ? currentOptions[selectedIndex].value : "";
      this.setData({
        wheelValue: [selectedIndex],
        [`form.${step.key}`]: step.key === "age" ? Number(currentValue) : currentValue
      });
    }
    this.setData({
      currentStep: step,
      currentOptions,
      currentValue,
      currentPlaceholder: step.placeholder || "",
      currentHint: step.hint || "",
      sectionLabel: SECTION_LABELS[step.section],
      mbtiPreview: buildMbtiPreview(this.data.mbti),
      isLastStep: this.data.index === steps.length - 1,
      canNext: this.isStepComplete(step)
    });
  },
  isStepComplete(step) {
    if (step.type === "mbti") return Boolean(this.data.mbti[step.mbtiIndex]);
    if (step.type === "traits") return this.data.form.personalTraits.length === 3;
    if (step.type === "select" || step.type === "wheel") return Boolean(this.data.form[step.key]);
    const value = this.data.form[step.key];
    return value !== undefined && value !== null && String(value).trim() !== "";
  },
  onWheelChange(event) {
    const index = event.detail.value[0] || 0;
    const option = this.data.currentOptions[index];
    if (!option) return;
    const step = this.data.currentStep;
    this.setData({
      wheelValue: [index],
      [`form.${step.key}`]: step.key === "age" ? Number(option.value) : option.value,
      currentValue: option.value,
      [`touched.${step.key}`]: true,
      canNext: true
    });
  },
  selectOption(event) {
    const value = event.currentTarget.dataset.value;
    const step = this.data.currentStep;
    this.setData({ [`form.${step.key}`]: step.key === "age" ? Number(value) : value, [`touched.${step.key}`]: true });
    this.refreshStep();
  },
  selectMbti(event) {
    const value = event.currentTarget.dataset.value;
    const step = this.data.currentStep;
    const mbti = this.data.mbti.slice();
    mbti[step.mbtiIndex] = value;
    const currentOptions = step.options.map((option) => ({
      ...option,
      selected: option.value === value
    }));
    this.setData({
      mbti,
      currentOptions,
      mbtiPreview: buildMbtiPreview(mbti),
      [`touched.${step.key}`]: true,
      canNext: true
    });
  },
  toggleTrait(event) {
    const value = event.currentTarget.dataset.value;
    const selected = this.data.form.personalTraits.slice();
    const index = selected.indexOf(value);
    if (index >= 0) {
      selected.splice(index, 1);
    } else if (selected.length < 3) {
      selected.push(value);
    } else {
      wx.showToast({ title: "最多选 3 个哦", icon: "none" });
    }
    this.setData({ "form.personalTraits": selected, "touched.personalTraits": true });
    this.refreshStep();
  },
  onInput(event) {
    const step = this.data.currentStep;
    const value = event.detail.value;
    this.setData({ [`form.${step.key}`]: value, currentValue: value, canNext: String(value).trim() !== "" });
  },
  chooseAvatar() {
    withAvatarUpload(this, chooseAndUploadAvatar, (url) => {
      this.setData({
        "form.avatarUrl": url,
        currentValue: url,
        canNext: true,
        "touched.avatarUrl": true
      });
    });
  },
  onWeChatAvatarChoose(event) {
    withAvatarUpload(this, () => syncWeChatAvatar(event.detail), (url) => {
      this.setData({
        "form.avatarUrl": url,
        currentValue: url,
        canNext: true,
        "touched.avatarUrl": true
      });
    });
  },
  validateStep() {
    const step = this.data.currentStep;
    if (step.type === "mbti") return Boolean(this.data.mbti[step.mbtiIndex]);
    if (step.type === "traits") return this.data.form.personalTraits.length === 3;
    if (step.type === "select" || step.type === "wheel") return Boolean(this.data.form[step.key]);
    const value = this.data.form[step.key];
    return value !== undefined && value !== null && String(value).trim() !== "";
  },
  next() {
    if (!this.validateStep()) {
      wx.showToast({ title: "这一题还没填好", icon: "none" });
      return;
    }
    if (!this.data.isLastStep) {
      this.setData({ index: this.data.index + 1 });
      this.refreshStep();
    } else {
      this.submit();
    }
  },
  prev() {
    if (this.data.index > 0) {
      this.setData({ index: this.data.index - 1 });
      this.refreshStep();
    }
  },
  async submit() {
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const data = await request({
        url: "/users/me/onboarding",
        method: "PUT",
        data: { ...this.data.form, mbti: this.data.mbti.join("") }
      });
      saveSession(getApp().globalData.token, data.user);
      this.setData({ finished: true });
      setTimeout(() => wx.switchTab({ url: "/pages/square/square" }), 900);
    } finally {
      this.setData({ submitting: false });
    }
  }
});
