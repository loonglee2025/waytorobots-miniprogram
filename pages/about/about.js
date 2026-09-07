Page({
  data: {},

  previewQR() {
    wx.previewImage({
      urls: ['/assets/waytorobots_qr.jpg']
    });
  },

  copyRepo() {
    wx.setClipboardData({
      data: 'https://github.com/loonglee2025/ros2-weekly-digest',
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
