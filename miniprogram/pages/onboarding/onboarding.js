const { request } = require("../../utils/request");
const { saveSession, requireLogin } = require("../../utils/session");

const steps = [
  { key: "college", title: "你的学院", type: "select", optionKey: "colleges" },
  { key: "grade", title: "你的年级", type: "select", optionKey: "grades" },
  { key: "age", title: "你的年龄", type: "select", optionKey: "ages" },
  { key: "nickname", title: "想怎么称呼你", type: "input", placeholder: "例如：知夏" },
  { key: "avatarUrl", title: "选择一个头像", type: "avatar", placeholder: "头像 URL，演示可使用默认头像" },
  { key: "gender", title: "你的性别", type: "select", optionKey: "genders" },
  { key: "hometown", title: "你的家乡", type: "select", optionKey: "hometowns" },
  { key: "wechatId", title: "你的微信号", type: "input", placeholder: "仅成功搭上并互换后展示" },
  { key: "campus", title: "常驻地点", type: "select", optionKey: "campuses" },
  { key: "mbti0", title: "你恢复能量的方式更像？", type: "mbti", mbtiIndex: 0, options: [{ label: "和人交流更有劲", value: "E" }, { label: "独处沉淀更舒服", value: "I" }] },
  { key: "mbti1", title: "你更容易注意到？", type: "mbti", mbtiIndex: 1, options: [{ label: "现实细节和经验", value: "S" }, { label: "可能性和灵感", value: "N" }] },
  { key: "mbti2", title: "做决定时你更依赖？", type: "mbti", mbtiIndex: 2, options: [{ label: "逻辑原则", value: "T" }, { label: "感受关系", value: "F" }] },
  { key: "mbti3", title: "安排事情时你更喜欢？", type: "mbti", mbtiIndex: 3, options: [{ label: "提前计划", value: "J" }, { label: "保持弹性", value: "P" }] },
  { key: "relationExpectation", title: "你期待的关系", type: "select", optionKey: "relationExpectations" },
  { key: "bio", title: "一句话介绍自己", type: "textarea", placeholder: "让对方快速认识你" },
  { key: "hobbies", title: "你的爱好", type: "textarea", placeholder: "例如：羽毛球、电影、自习" },
  { key: "favoriteThings", title: "最喜欢的三件事", type: "textarea", placeholder: "用逗号隔开也可以" },
  { key: "messageToPeer", title: "给对方的一句话", type: "textarea", placeholder: "你希望对方先知道什么？" },
  { key: "dealBreakers", title: "绝对禁忌/雷点", type: "textarea", placeholder: "例如：临时爽约、不尊重边界" },
  { key: "personalTraits", title: "选择 3 个个人特质", type: "traits" }
];

Page({
  data: {
    steps,
    index: 0,
    currentStep: steps[0],
    currentOptions: [],
    currentValue: "",
    currentPlaceholder: steps[0].placeholder || "",
    isLastStep: false,
    options: {},
    mbti: ["E", "N", "F", "P"],
    form: {
      college: "",
      grade: "",
      age: 20,
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
    submitting: false
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
    const nextForm = {
      ...form,
      college: existing.college || data.colleges[0],
      grade: existing.grade || data.grades[0],
      age: existing.age || data.ages[2],
      nickname: existing.nickname || form.nickname,
      avatarUrl: existing.avatarUrl || form.avatarUrl,
      gender: existing.gender || data.genders[0],
      hometown: existing.hometown || data.hometowns[2],
      wechatId: existing.wechatId || form.wechatId,
      campus: existing.campus || data.campuses[1],
      relationExpectation: existing.relationExpectation || data.relationExpectations[0],
      bio: existing.bio || form.bio,
      hobbies: existing.hobbies || form.hobbies,
      favoriteThings: existing.favoriteThings || form.favoriteThings,
      messageToPeer: existing.messageToPeer || form.messageToPeer,
      dealBreakers: existing.dealBreakers || form.dealBreakers,
      personalTraits: existing.personalTraits && existing.personalTraits.length === 3 ? existing.personalTraits : form.personalTraits
    };
    const mbti = existing.mbti && existing.mbti.length === 4 ? existing.mbti.split("") : this.data.mbti;
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
        selected: option.value === currentValue
      }));
    } else if (step.type === "traits") {
      currentOptions = (this.data.options.personalTraits || []).map((value) => ({
        label: value,
        value,
        selected: this.data.form.personalTraits.indexOf(value) >= 0
      }));
    }
    this.setData({
      currentStep: step,
      currentOptions,
      currentValue,
      currentPlaceholder: step.placeholder || "",
      isLastStep: this.data.index === steps.length - 1
    });
  },
  selectOption(event) {
    const value = event.currentTarget.dataset.value;
    const step = this.data.currentStep;
    this.setData({ [`form.${step.key}`]: step.key === "age" ? Number(value) : value });
    this.refreshStep();
  },
  selectMbti(event) {
    const value = event.currentTarget.dataset.value;
    const mbti = this.data.mbti.slice();
    mbti[this.data.currentStep.mbtiIndex] = value;
    this.setData({ mbti });
    this.refreshStep();
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
      wx.showToast({ title: "只能选择 3 个", icon: "none" });
    }
    this.setData({ "form.personalTraits": selected });
    this.refreshStep();
  },
  onInput(event) {
    const step = this.data.currentStep;
    this.setData({ [`form.${step.key}`]: event.detail.value, currentValue: event.detail.value });
  },
  validateStep() {
    const step = this.data.currentStep;
    if (step.type === "mbti") return true;
    if (step.type === "traits") return this.data.form.personalTraits.length === 3;
    const value = this.data.form[step.key];
    return value !== undefined && value !== null && String(value).trim() !== "";
  },
  next() {
    if (!this.validateStep()) {
      wx.showToast({ title: "请先完成这一项", icon: "none" });
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
