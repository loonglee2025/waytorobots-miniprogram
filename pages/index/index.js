const api = require('../../utils/api');

Page({
  data: {
    channels: [],
    current: 0,
    reports: [],
    loading: true,
    error: ''
  },

  onLoad() {
    const channels = api.channels();
    this.setData({ channels });
    this.fetchList();
  },

  onPullDownRefresh() {
    this.fetchList().finally(() => wx.stopPullDownRefresh());
  },

  switchChannel(e) {
    const idx = Number(e.currentTarget.dataset.index);
    if (idx === this.data.current) return;
    this.setData({ current: idx, reports: [] });
    this.fetchList();
  },

  fetchList() {
    const ch = this.data.channels[this.data.current];
    this.setData({ loading: true, error: '' });
    return api.listReports(ch.key)
      .then(reports => {
        this.setData({ reports, loading: false });
        this.fetchSummaries(ch.key);
      })
      .catch(err => {
        console.error('listReports failed', err);
        this.setData({
          loading: false,
          error: '周报列表加载失败，请下拉刷新重试'
        });
      });
  },

  /** 逐条拉取摘要并渐进填充；失败静默（不影响标题列表） */
  fetchSummaries(chKey) {
    this.data.reports.forEach((r, idx) => {
      api
        .getReportSummary(chKey, r.name)
        .then(summary => {
          const cur = this.data.channels[this.data.current];
          if (!cur || cur.key !== chKey || !summary) return; // 已切换频道则丢弃
          // 注意：不要用计算属性键（{ [`...`]: v }），增强编译 × 按需注入下
          // 会引入 @babel/runtime 缺失模块导致页面注入失败
          const patch = {};
          patch['reports[' + idx + '].summary'] = summary;
          this.setData(patch);
        })
        .catch(err => console.warn('getReportSummary failed', r.name, err));
    });
  },

  openReport(e) {
    const { name, title } = e.currentTarget.dataset;
    const ch = this.data.channels[this.data.current];
    wx.navigateTo({
      url: `/pages/detail/detail?ch=${ch.key}&name=${encodeURIComponent(name)}&title=${encodeURIComponent(title)}`
    });
  },

  onShareAppMessage() {
    return {
      title: '机器人技术周报 · WayToRobots',
      path: '/pages/index/index'
    };
  }
});
