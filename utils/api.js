/**
 * GitHub 数据源封装（多频道）
 * 周报列表：GitHub Contents API（列出 reports/ 目录）
 * 周报内容：raw.githubusercontent.com 直取 Markdown 原文
 */

const app = getApp();

function channels() {
  return (app && app.globalData && app.globalData.channels) || [];
}

function getChannel(key) {
  const list = channels();
  return list.find(c => c.key === key) || list[0];
}

function request(url) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      header: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'waytorobots-miniprogram'
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error('HTTP ' + res.statusCode));
        }
      },
      fail: reject
    });
  });
}

/** 获取指定频道的周报列表，按日期倒序：[{ name, date, title }] */
function listReports(channelKey) {
  const ch = getChannel(channelKey);
  const url = `https://api.github.com/repos/${ch.repo}/contents/${ch.reportsPath}?ref=${ch.branch}`;
  return request(url).then(files => {
    return files
      .filter(f => f.type === 'file' && /^\d{4}-\d{2}-\d{2}-weekly\.md$/.test(f.name))
      .map(f => {
        const date = f.name.slice(0, 10);
        return { name: f.name, date, title: `${ch.name} · ${date}` };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  });
}

/** 获取某一期周报的 Markdown 原文 */
function getReport(channelKey, name) {
  const ch = getChannel(channelKey);
  const url = `https://raw.githubusercontent.com/${ch.repo}/${ch.branch}/${ch.reportsPath}/${name}`;
  return request(url);
}

module.exports = { channels, getChannel, listReports, getReport };
