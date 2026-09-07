/**
 * GitHub 数据源封装
 * 周报列表：GitHub Contents API（列出 reports/ 目录）
 * 周报内容：raw.githubusercontent.com 直取 Markdown 原文
 */

const app = getApp();

function cfg() {
  const g = (app && app.globalData) || {
    repo: 'loonglee2025/ros2-weekly-digest',
    branch: 'main',
    reportsPath: 'reports'
  };
  return g;
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

/** 获取周报列表，按日期倒序：[{ name, date, title }] */
function listReports() {
  const { repo, branch, reportsPath } = cfg();
  const url = `https://api.github.com/repos/${repo}/contents/${reportsPath}?ref=${branch}`;
  return request(url).then(files => {
    return files
      .filter(f => f.type === 'file' && /^\d{4}-\d{2}-\d{2}-weekly\.md$/.test(f.name))
      .map(f => {
        const date = f.name.slice(0, 10);
        return { name: f.name, date, title: `ROS2 技术周报 · ${date}` };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  });
}

/** 获取某一期周报的 Markdown 原文 */
function getReport(name) {
  const { repo, branch, reportsPath } = cfg();
  const url = `https://raw.githubusercontent.com/${repo}/${branch}/${reportsPath}/${name}`;
  return request(url);
}

module.exports = { listReports, getReport };
