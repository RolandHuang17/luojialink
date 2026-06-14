const { request } = require("../../utils/request");
const { requireLogin, saveSession } = require("../../utils/session");

function defaultForm() {
  return {
    college: "",
    grade: "",
    age: 20,
    nickname: "",
    avatarUrl: "",
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
  };
}

function indexOf(options, value) {
  const index = (options || []).findIndex((item) => String(item) === String(value));
  return Math.max(0, index);
}

function normalizeGrade(value, grades) {
  if ((grades || []).includes(value)) return value;
  const legacyMap = {
    "2026": "大一",
    "2025": "大二",
    "2024": "大三",
    "2023": "大四",
    "2022": "大五"
  };
  return legacyMap[value] || grades[0];
}

function normalizeAge(value, ages) {
  return (ages || []).includes(value) ? value : 20;
}

Page({
  data: {
    options: {},
    indexes: {},
    mbtiText: "ENFP",
    form: defaultForm(),
    traitOptions: [],
    saving: false
  },
  onLoad() {
    if (!requireLogin()) return;
  },
  onShow() {
    if (!requireLogin()) return;
    this.load();
  },
  async load() {
    const [options, profile] = await Promise.all([
      request({ url: "/users/options" }),
      request({ url: "/users/me/profile" })
    ]);
    const user = profile.user;
    const form = {
      ...defaultForm(),
      college: user.college || options.colleges[0],
      grade: normalizeGrade(user.grade, options.grades),
      age: normalizeAge(user.age, options.ages),
      nickname: user.nickname || "",
      avatarUrl: user.avatarUrl || "",
      gender: user.gender || options.genders[0],
      hometown: user.hometown || options.hometowns[0],
      wechatId: user.wechatId || "",
      campus: user.campus || options.campuses[0],
      relationExpectation: user.relationExpectation || options.relationExpectations[0],
      bio: user.bio || "",
      hobbies: user.hobbies || "",
      favoriteThings: user.favoriteThings || "",
      messageToPeer: user.messageToPeer || "",
      dealBreakers: user.dealBreakers || "",
      personalTraits: user.personalTraits || []
    };
    const mbtiText = user.mbti && user.mbti.length === 4 ? user.mbti : "ENFP";
    this.setData({ options, form, mbtiText });
    this.refreshDerived();
  },
  refreshDerived() {
    const options = this.data.options;
    const form = this.data.form;
    this.setData({
      indexes: {
        college: indexOf(options.colleges, form.college),
        grade: indexOf(options.grades, form.grade),
        age: indexOf(options.ages, form.age),
        gender: indexOf(options.genders, form.gender),
        hometown: indexOf(options.hometowns, form.hometown),
        campus: indexOf(options.campuses, form.campus),
        relationExpectation: indexOf(options.relationExpectations, form.relationExpectation)
      },
      traitOptions: (options.personalTraits || []).map((value) => ({
        value,
        selected: form.personalTraits.indexOf(value) >= 0
      }))
    });
  },
  onInput(event) {
    this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value });
  },
  onPickerChange(event) {
    const key = event.currentTarget.dataset.key;
    const optionMap = {
      college: "colleges",
      grade: "grades",
      age: "ages",
      gender: "genders",
      hometown: "hometowns",
      campus: "campuses",
      relationExpectation: "relationExpectations"
    };
    const options = this.data.options[optionMap[key]] || [];
    const value = options[Number(event.detail.value)];
    this.setData({ [`form.${key}`]: key === "age" ? Number(value) : value });
    this.refreshDerived();
  },
  goMbtiTest() {
    wx.navigateTo({ url: `/pages/profile-mbti/profile-mbti?mbti=${this.data.mbtiText}` });
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
      return;
    }
    this.setData({ "form.personalTraits": selected });
    this.refreshDerived();
  },
  validate() {
    const required = [
      "college",
      "grade",
      "nickname",
      "avatarUrl",
      "gender",
      "hometown",
      "wechatId",
      "campus",
      "relationExpectation",
      "bio",
      "hobbies",
      "favoriteThings",
      "messageToPeer",
      "dealBreakers"
    ];
    const missing = required.some((key) => !String(this.data.form[key] || "").trim());
    if (missing || this.data.form.personalTraits.length !== 3) {
      wx.showToast({ title: "请补全资料并选择 3 个特质", icon: "none" });
      return false;
    }
    return true;
  },
  async save() {
    if (this.data.saving || !this.validate()) return;
    this.setData({ saving: true });
    try {
      const data = await request({
        url: "/users/me/profile",
        method: "PUT",
        data: { ...this.data.form, mbti: this.data.mbtiText }
      });
      saveSession(getApp().globalData.token, data.user);
      wx.showToast({ title: "已保存" });
      setTimeout(() => wx.navigateBack(), 500);
    } finally {
      this.setData({ saving: false });
    }
  }
});
