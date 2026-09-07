const api = require('../../utils/api');

Page({
  data: {
    reports: [],
    loading: true,
    error: ''
  },

  onLoad() {
    this.fetchList();
  },

  onPullDownRefresh() {
    this.fetchList().finally(() => wx.stopPullDownRefresh());
  },

  fetchList() {
    this.setData({ loading: true, error: '' });
    return api.listReports()
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
    wx.navigateTo({
      url: `/pages/detail/detail?name=${encodeURIComponent(name)}&title=${encodeURIComponent(title)}`
    });
  },

  onShareAppMessage() {
    return {
      title: 'ROS2 技术周报 · WayToRobots',
      path: '/pages/index/index'
    };
  }
});
