const api = require('../../utils/api');
const md = require('../../utils/markdown');

Page({
  data: {
    title: '',
    blocks: [],
    loading: true,
    error: ''
  },

  onLoad(query) {
    const { ch, name, title } = query;
    this.channel = ch || 'ros2';
    if (title) {
      const t = decodeURIComponent(title);
      this.setData({ title: t });
      wx.setNavigationBarTitle({ title: t });
    }
    this.name = decodeURIComponent(name || '');
    this.fetchReport();
  },

  fetchReport() {
    this.setData({ loading: true, error: '' });
    api.getReport(this.channel, this.name)
      .then(text => {
        const blocks = md.parse(text);
        this.setData({ blocks, loading: false });
      })
      .catch(err => {
        console.error('getReport failed', err);
        this.setData({ loading: false, error: '内容加载失败，请返回重试' });
      });
  },

  /** 小程序内无法直接打开外部链接，点击复制到剪贴板 */
  copyLink(e) {
    const { url } = e.currentTarget.dataset;
    if (!url) return;
    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'none' })
    });
  },

  onShareAppMessage() {
    return {
      title: this.data.title || '机器人技术周报',
      path: `/pages/detail/detail?ch=${this.channel}&name=${encodeURIComponent(this.name)}&title=${encodeURIComponent(this.data.title)}`
    };
  }
});
