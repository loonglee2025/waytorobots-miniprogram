Page({
  data: {
    repos: []
  },

  onLoad() {
    const app = getApp();
    const channels = (app.globalData && app.globalData.channels) || [];
    this.setData({
      repos: channels.map(c => ({
        name: c.name,
        repo: c.repo,
        url: `https://github.com/${c.repo}`
      }))
    });
  },

  previewQR() {
    wx.previewImage({
      urls: ['/assets/waytorobots_qr.jpg']
    });
  },

  copyRepo(e) {
    const { url } = e.currentTarget.dataset;
    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: '仓库地址已复制', icon: 'none' })
    });
  },

  onShareAppMessage() {
    return {
      title: 'ROS2 技术周报 · WayToRobots',
      path: '/pages/index/index'
    };
  }
});
