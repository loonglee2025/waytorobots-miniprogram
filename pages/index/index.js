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
      .then(reports => this.setData({ reports, loading: false }))
      .catch(err => {
        console.error('listReports failed', err);
        this.setData({
          loading: false,
          error: '周报列表加载失败，请下拉刷新重试'
        });
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
